-- Import odierni per dominio vs mediana dei giorni precedenti (solo giorni con import).
-- Placeholder: {{source}} {{today}} {{median_days}}
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
    SELECT dominio, n FROM daily WHERE giorno < '{{today}}'
),
ranked AS (
    SELECT
        dominio,
        n,
        ROW_NUMBER() OVER (PARTITION BY dominio ORDER BY n) AS rn,
        COUNT(*) OVER (PARTITION BY dominio) AS cnt
    FROM hist
),
mediana AS (
    SELECT dominio, AVG(n * 1.0) AS mediana
    FROM ranked
    WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
    GROUP BY dominio
)
SELECT
    COALESCE(t.dominio, m.dominio) AS dominio,
    COALESCE(t.n, 0) AS import,
    m.mediana AS mediana,
    CASE WHEN m.mediana IS NULL THEN NULL ELSE COALESCE(t.n, 0) - m.mediana END AS delta
FROM today_n t
LEFT JOIN mediana m ON m.dominio = t.dominio
UNION
SELECT
    m.dominio AS dominio,
    0 AS import,
    m.mediana AS mediana,
    0 - m.mediana AS delta
FROM mediana m
LEFT JOIN today_n t ON t.dominio = m.dominio
WHERE t.dominio IS NULL
ORDER BY import DESC, dominio ASC;
