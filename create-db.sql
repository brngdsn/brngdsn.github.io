revoke all privileges on DATABASE bg_consulting_db from bg_consulting_db_user;
revoke all privileges on all tables in schema public from bg_consulting_db_user;
revoke all privileges on all sequences in schema public from bg_consulting_db_user;
drop owned by bg_consulting_db_user cascade;

drop database if exists bg_consulting_db;
drop user if exists bg_consulting_db_user;

create database bg_consulting_db;

\connect bg_consulting_db;

drop table if exists users;

create user bg_consulting_db_user with encrypted password '@StrawberrySuperman1';
grant all privileges on database bg_consulting_db to bg_consulting_db_user;
grant all privileges on all tables in schema public to bg_consulting_db_user;
grant usage, select on all sequences in schema public to bg_consulting_db_user;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  born date not null default now(),
  email varchar(50) unique not null,
  confirmed integer default 0,
  confirmkey varchar(128) default null
);
