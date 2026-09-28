-- Round trip alone, to separate network latency from query cost: every
-- other script's time includes one of these per statement.
SELECT 1;
