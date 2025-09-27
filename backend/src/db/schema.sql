DROP TABLE IF EXISTS tasks CASCADE;

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'todo'
);