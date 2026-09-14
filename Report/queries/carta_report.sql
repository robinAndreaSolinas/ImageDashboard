-- Articoli carta di oggi per dominio vs mediana dello stesso weekday
-- sugli ultimi {{median_days}} giorni (escluso oggi).
-- Placeholder: {{source}} {{today}} {{median_days}}
-- Scarto % = (oggi - mediana_stesso_giorno) / mediana_stesso_giorno * 100
WITH raw AS (
    SELECT
        date(fetched_at) AS giorno,
        CASE
            WHEN instr(article_url, '://') > 0
            THEN substr(article_url, instr(article_url, '://') + 3)
            ELSE article_url
        END AS rest
    FROM article_image
    WHERE lower(source) = lower('{{source}}')
      AND date(fetched_at) >= date('{{today}}', '-{{median_days}} days')
      AND date(fetched_at) <= date('{{today}}')
),
stripped AS (
    SELECT
        giorno,
        CASE
            WHEN instr(rest, '/') > 0 THEN substr(rest, 1, instr(rest, '/') - 1)
            ELSE rest
        END AS host
    FROM raw
),
noport AS (
    SELECT
        giorno,
        CASE
            WHEN instr(host, ':') > 0 THEN substr(host, 1, instr(host, ':') - 1)
            ELSE host
        END AS host2
    FROM stripped
),
dom AS (
    SELECT
        giorno,
        CASE
            WHEN lower(host2) LIKE 'www.%' THEN substr(lower(host2), 5)
            ELSE lower(host2)
        END AS dominio
    FROM noport
),
daily AS (
    SELECT dominio, giorno, COUNT(*) AS n
    FROM dom
    GROUP BY dominio, giorno
),
today_n AS (
    SELECT dominio, n FROM daily WHERE giorno = '{{today}}'
),
hist AS (
    SELECT dominio, n
    FROM daily
    WHERE giorno < '{{today}}'
      AND strftime('%w', giorno) = strftime('%w', '{{today}}')
),
ranked AS (
    SELECT
        dominio,
        n,
        ROW_NUMBER() OVER (PARTITION BY dominio ORDER BY n) AS rn,
        COUNT(*) OVER (PARTITION BY dominio) AS cnt
    FROM hist
),
riferimento AS (
    SELECT dominio, AVG(n * 1.0) AS mediana
    FROM ranked
    WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
    GROUP BY dominio
)
SELECT
    t.dominio AS dominio,
    t.n AS oggi,
    CASE
        WHEN r.mediana IS NULL OR r.mediana = 0 THEN NULL
        ELSE ROUND(100.0 * (t.n - r.mediana) / r.mediana, 0)
    END AS scarto_pct
FROM today_n t
LEFT JOIN riferimento r ON r.dominio = t.dominio
ORDER BY oggi DESC, dominio ASC;
