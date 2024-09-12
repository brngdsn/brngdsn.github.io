revoke all privileges on DATABASE bg_consulting_db from bg_consulting_db_user;
revoke all privileges on all tables in schema public from bg_consulting_db_user;
revoke all privileges on all sequences in schema public from bg_consulting_db_user;
drop owned by bg_consulting_db_user cascade;

drop database if exists bg_consulting_db;
drop user if exists bg_consulting_db_user;

create database bg_consulting_db;

\connect bg_consulting_db;

drop table if exists users;
drop table if exists system_logs;

create user bg_consulting_db_user with encrypted password :'db_user_password';
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

CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    uptime double precision,
    total_memory BIGINT,
    free_memory BIGINT,
    cpu_usage JSONB,
    load_avg REAL[],
    platform VARCHAR(50),
    arch VARCHAR(50),
    hostname VARCHAR(255)
);

-- Index on timestamp for faster querying
CREATE INDEX idx_system_logs_timestamp ON system_logs (timestamp);

-- Automatically delete logs older than 30 days
CREATE OR REPLACE FUNCTION delete_old_logs() RETURNS trigger AS $$
BEGIN
  DELETE FROM system_logs WHERE timestamp < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delete_old_logs_trigger
AFTER INSERT ON system_logs
FOR EACH STATEMENT EXECUTE FUNCTION delete_old_logs();

grant all privileges on all tables in schema public to bg_consulting_db_user;
grant usage, select on all sequences in schema public to bg_consulting_db_user;