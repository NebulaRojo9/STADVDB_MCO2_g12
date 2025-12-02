
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT * FROM title_basics WHERE tconst ='02' FOR UPDATE;
UPDATE title_basics SET primaryTitle = 'The Karate Kid' WHERE tconst = '02';
SELECT SLEEP(10);
COMMIT;


# run in separate terminal
START TRANSACTION;
UPDATE title_basics SET primaryTitle = 'Muay Thai' WHERE tconst = '02';
COMMIT;