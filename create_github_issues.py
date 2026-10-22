import json
import os
import subprocess
import sys

def create_issues():
    issues_file = ".github/issues.json"
    if not os.path.exists(issues_file):
        print("Error: .github/issues.json file not found.")
        sys.exit(1)

    with open(issues_file, "r") as f:
        issues = json.load(f)

    print(f"Loaded {len(issues)} atomic GitHub issues from {issues_file}.")
    print("Attempting to create issues via GitHub CLI ('gh')...
")

    for issue in issues:
        title = issue["title"]
        body = issue["body"]
        labels = ",".join(issue["labels"])

        cmd = [
            "gh", "issue", "create",
            "--title", title,
            "--body", body,
            "--label", labels
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0:
                print(f"[SUCCESS] Created Issue #{issue['number']}: {title}")
            else:
                print(f"[FAILED] Issue #{issue['number']}: {res.stderr.strip()}")
        except FileNotFoundError:
            print("Error: 'gh' GitHub CLI tool is not installed or not in PATH.")
            print("To run this script automatically, please install GitHub CLI or run with a GitHub personal access token.")
            sys.exit(1)

if __name__ == "__main__":
    create_issues()
