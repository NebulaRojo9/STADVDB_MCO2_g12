-- Create the database and table
CREATE DATABASE db;

USE db;

CREATE TABLE title_basics (
  tconst VARCHAR(10) PRIMARY KEY, -- Using Tconst as PK since it seems like the ID
  titleType VARCHAR(50), 
  primaryTitle VARCHAR(255), 
  originalTitle VARCHAR(255), 
  isAdult BOOLEAN, 
  startYear INT, 
  endYear INT, 
  runtimeMinutes INT, 
  genres VARCHAR(255)
);