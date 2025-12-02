
#(1) First and Foremost: SET Isolation levels to test if different kinds of anomaly occurs
SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;


/* ----------------- DIRTY READ TEST  ----------------- */
# Reader checking for dirty reads
START TRANSACTION;
SELECT * FROM title_basics WHERE tconst='tt1375666';
COMMIT;

# Writer performing uncommitted write (NO commit; command)
START TRANSACTION;
UPDATE title_basics SET primaryTitle='TEST_DIRTYREAD' WHERE tconst='tt1375666';
ROLLBACK;



/* ----------------- NONREPEATABLE READ TEST  ----------------- */
# Reader checking for nonrepeatable read
START TRANSACTION;
SELECT * FROM title_basics WHERE tconst='tt0816692';
COMMIT;

# Updater committing the changes
START TRANSACTION;
UPDATE title_basics SET originalTitle="TEST_NONREPEATABLE" WHERE tconst='tt0816692';
COMMIT;



/* ----------------- PHANTOM READ TEST  ----------------- */
# Reader checking for phantom read
START TRANSACTION;
SELECT * FROM title_basics;
SELECT COUNT(*) FROM title_basics;

# Updater creating or deleting rows
START TRANSACTION;
INSERT INTO title_basics
VALUES  ('ST11', 'STADVDB', 'Phantom Read 1', 'Desperate to Finish MCO2 #1', 1, 2025, NULL, 39, 'Student Apocalypse'),
        ('ST12', 'STADVDB', 'Phantom Read 2', 'Desperate to Finish MCO2 #2', 1, 2025, NULL, 27, 'Academic Stress'),
        ('ST13', 'STADVDB', 'Phantom Read 3', 'Desperate to Finish MCO2 #3', 1, 2025, NULL, 23, 'Overdue Deadline');

DELETE FROM title_basics WHERE tconst='ST11';
DELETE FROM title_basics WHERE tconst='ST12';
DELETE FROM title_basics WHERE tconst='ST13';



/* ----------------- LOST UPDATE TEST  ----------------- */
# The first Writer
START TRANSACTION;
UPDATE title_basics SET runTimeMinutes=(runTimeMinutes+31) WHERE tconst = 'tt0816692';
COMMIT;

# The second Write
START TRANSACTION;
UPDATE title_basics SET runTimeMinutes=(runTimeMinutes+44) WHERE tconst = 'tt0816692';
COMMIT;

# check for final results for both terminals
SELECT * FROM title_basics;

