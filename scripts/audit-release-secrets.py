"""Bounded, redacted credential-pattern check of tracked files and HEAD history.

This is a heuristic audit aid, not a replacement for a dedicated secret scanner.
Reports paths/object IDs and rule names only; never prints a matched value.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess

RULES = {
    "private_key": rb"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\r\n]{80,}-----END",
    "github_token": rb"\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b",
    "aws_access_key": rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b",
    "slack_token": rb"\bxox[baprs]-[A-Za-z0-9-]{30,}\b",
    "stripe_secret": rb"\bsk_live_[A-Za-z0-9]{24,}\b",
    "credential_url": rb"(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^\s/:@\"']{2,}:[^\s/@\"']{16,}@",
    "literal_secret": rb"(?i)\b(?:verifier_?secret|rate_?secret|client_?secret|r2_secret_access_key|jwt_?secret|api_?key|password|private_?key)\s*[\"']?\s*[:=]\s*[\"']([A-Za-z0-9_+/=-]{24,})[\"']",
}
COMPILED = {name: re.compile(pattern) for name, pattern in RULES.items()}


def matches(data):
    found = []
    for name, pattern in COMPILED.items():
        for match in pattern.finditer(data):
            if name == "literal_secret":
                value = match.group(1)
                if len(set(value)) < 10 or re.search(rb"(?i)(example|placeholder|replace|dummy|redacted|your[_-])", value):
                    continue
            found.append(name)
            break
    return found


def audit(root, extras):
    findings, checked = [], {"working_files": 0, "history_blobs": 0, "extra_files": 0}
    paths = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
    for name in filter(None, paths):
        path = root / name
        if not path.is_file():
            continue
        checked["working_files"] += 1
        rules = matches(path.read_bytes())
        if rules:
            findings.append({"scope": "working", "path": name, "rules": rules})
    objects = subprocess.check_output(["git", "rev-list", "--objects", "HEAD"], cwd=root).decode().splitlines()
    with subprocess.Popen(["git", "cat-file", "--batch"], cwd=root, stdin=subprocess.PIPE, stdout=subprocess.PIPE) as proc:
        for line in objects:
            oid, _, name = line.partition(" ")
            proc.stdin.write((oid + "\n").encode()); proc.stdin.flush()
            header = proc.stdout.readline().decode().split()
            size = int(header[2])
            data = proc.stdout.read(size); proc.stdout.read(1)
            if header[1] != "blob":
                continue
            checked["history_blobs"] += 1
            rules = matches(data)
            if rules:
                findings.append({"scope": "history", "object": oid, "path": name, "rules": rules})
        proc.stdin.close()
        proc.wait()
    for value in extras:
        path = Path(value)
        checked["extra_files"] += 1
        rules = matches(path.read_bytes())
        if rules:
            findings.append({"scope": "artifact", "path": path.name, "rules": rules})
    return {"method": "credential patterns, no secret values emitted", "checked": checked, "findings": findings}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact", action="append", default=[])
    args = parser.parse_args()
    result = audit(Path(__file__).resolve().parents[1], args.artifact)
    print(json.dumps(result, indent=2))
    raise SystemExit(bool(result["findings"]))
