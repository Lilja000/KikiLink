-- Additive: old clients still send a free-text reason and read a reason string.
ALTER TABLE reports ADD COLUMN reason_code TEXT;
ALTER TABLE reports ADD COLUMN client_id TEXT;
CREATE UNIQUE INDEX report_request_id ON reports(reporter,client_id) WHERE client_id IS NOT NULL;
