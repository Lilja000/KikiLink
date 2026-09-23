import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Database } from '../src/db.mjs';
import { fixture } from './helpers.mjs';

test('Migrations 006/007/008 preserve a five-migration database, repeat safely, and require explicit upgrade', t => {
  const dir=mkdtempSync(join(tmpdir(),'kikilink-upgrade-')), path=join(dir,'legacy.sqlite'); t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const raw=new DatabaseSync(path), migrationDir=new URL('../migrations/',import.meta.url);
  raw.exec('CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL,applied_at INTEGER NOT NULL) STRICT');
  for(const name of readdirSync(migrationDir).filter(n=>/^00[1-5]_.*\.sql$/.test(n)).sort()) {
    const sql=readFileSync(new URL(name,migrationDir),'utf8'); raw.exec(sql);
    raw.prepare('INSERT INTO schema_migrations VALUES(?,?,?)').run(name,createHash('sha256').update(sql).digest('hex'),123);
  }
  raw.prepare('INSERT INTO users VALUES(101,123,0)').run();
  raw.prepare('INSERT INTO profiles VALUES(101,?,7,1,123)').run('encrypted-legacy-payload-canary');
  raw.prepare("INSERT INTO reports(reporter,target_type,target_id,reason,created_at) VALUES(101,'profile','202',?,123)").run('encrypted-legacy-reason-canary'); raw.close();
  assert.throws(()=>new Database(path),/explicit migration/);
  let db=new Database(path,{migrate:true}); assert.equal(db.migrations().length,9);
  assert.equal(db.get('SELECT payload FROM profiles').payload,'encrypted-legacy-payload-canary');
  assert.equal(db.get('SELECT revision FROM profiles').revision,7); assert.equal(db.get('SELECT reason_code FROM reports').reason_code,null);
  assert.equal(db.get('SELECT reason FROM reports').reason,'encrypted-legacy-reason-canary'); db.close();
  db=new Database(path,{migrate:true}); assert.equal(db.get('SELECT count(*) AS n FROM schema_migrations').n,9); assert.equal(db.healthy(),true); db.close();
});
test('The explicit feature pause preserves new data and keeps stable profile/report APIs usable', async t=>{
  const f=await fixture(t); await f.login(101); await f.login(202);
  await f.ok('PUT','/v1/capabilities/me',{friendRequests:true,directMessages:true},101);
  const original=await f.ok('PUT','/v1/preferences/me',{mode:'private',ratings:{'interest.bondage':2},revision:0},101);
  const encrypted=f.db.get('SELECT ratings FROM interest_preferences').ratings;
  f.config.communityEnabled=false;
  const me=await f.ok('GET','/v1/me',undefined,101); assert.equal(me.features.community,false); assert.equal(me.features.preferences,false);
  for(const path of ['/v1/preferences/me','/v1/direct/inbox','/v1/relationships','/v1/mailbox','/v1/feed/unread','/v1/read-cursors']) assert.equal((await f.request('GET',path,undefined,101)).statusCode,404,path);
  assert.equal((await f.request('PUT','/v1/preferences/me',{mode:'public',ratings:{},revision:original.revision},101)).statusCode,404);
  assert.equal(f.db.get('SELECT ratings FROM interest_preferences').ratings,encrypted);
  const profile=await f.ok('PUT','/v1/profiles/me',{displayName:'Stable client',bio:'Still editable',statusMessage:'',avatarId:null,bannerId:null,visible:true,revision:0},101);
  assert.equal(profile.displayName,'Stable client');
  await f.ok('POST','/v1/reports',{targetType:'profile',targetId:'101',reason:'Free text from the stable client'},202,201);
  assert.equal(f.db.get('SELECT count(*) AS n FROM mailbox').n,0);
  f.config.communityEnabled=true; assert.deepEqual(await f.ok('GET','/v1/preferences/me',undefined,101),original);
});
