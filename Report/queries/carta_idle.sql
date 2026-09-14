-- Conteggio articoli della fonte nelle ultime idle_hours.
-- Placeholder: {{source}} {{now}} {{idle_hours}}
SELECT COUNT(*) AS n
FROM article_image
WHERE lower(source) = lower('{{source}}')
  AND fetched_at >= datetime('{{now}}', '-{{idle_hours}} hours');
