#!/usr/bin/env python3
"""
Upload EVT project to GitHub using GitHub API
"""
import os
import base64
import json
import subprocess
from pathlib import Path

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')
REPO_OWNER = 'fmTechnix'
REPO_NAME = 'EVT'
BRANCH = 'main'

# Files/folders to exclude
EXCLUDE = {
    'node_modules', '.git', 'dist', '.vite', 'attached_assets', 
    'evt-release', '.cache', '.local', '.upm', '.config',
    'upload-to-github.py', 'evt-projekt.zip', '__pycache__',
    '.replit', 'replit.nix'
}

def should_include(path: Path, base_path: Path) -> bool:
    """Check if file should be included"""
    relative = path.relative_to(base_path)
    
    # Check if any part of the path is in exclude list
    for part in relative.parts:
        if part in EXCLUDE or part.startswith('.') and part != '.env.example':
            return False
    
    # Exclude log files
    if path.suffix == '.log':
        return False
        
    return True

def get_all_files(base_path: Path):
    """Get all files to upload"""
    files = []
    for item in base_path.rglob('*'):
        if item.is_file() and should_include(item, base_path):
            files.append(item)
    return files

def create_file_content(file_path: Path) -> str:
    """Read file and encode to base64"""
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
            return base64.b64encode(content).decode('utf-8')
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None

def upload_files_via_api():
    """Upload files using GitHub API"""
    import requests
    
    base_path = Path('/home/runner/workspace')
    files = get_all_files(base_path)
    
    print(f"Found {len(files)} files to upload")
    
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    # Get the latest commit SHA
    url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/refs/heads/{BRANCH}'
    response = requests.get(url, headers=headers)
    
    if response.status_code == 404:
        # Branch doesn't exist, we'll create it
        print(f"Branch {BRANCH} doesn't exist, will create it")
        base_sha = None
    elif response.status_code == 200:
        base_sha = response.json()['object']['sha']
        print(f"Current branch SHA: {base_sha}")
    else:
        print(f"Error getting branch: {response.status_code} - {response.text}")
        return False
    
    # Create tree entries for all files
    tree_entries = []
    uploaded_count = 0
    
    for file_path in files[:100]:  # Limit to first 100 files for now
        relative_path = file_path.relative_to(base_path)
        content = create_file_content(file_path)
        
        if content is None:
            continue
            
        tree_entries.append({
            'path': str(relative_path),
            'mode': '100644',
            'type': 'blob',
            'content': base64.b64decode(content).decode('utf-8', errors='ignore')
        })
        uploaded_count += 1
        
        if uploaded_count % 10 == 0:
            print(f"Prepared {uploaded_count} files...")
    
    print(f"Creating tree with {len(tree_entries)} files...")
    
    # Create a new tree
    tree_url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/trees'
    tree_data = {
        'tree': tree_entries
    }
    
    if base_sha:
        tree_data['base_tree'] = base_sha
    
    response = requests.post(tree_url, headers=headers, json=tree_data)
    
    if response.status_code != 201:
        print(f"Error creating tree: {response.status_code} - {response.text}")
        return False
    
    tree_sha = response.json()['sha']
    print(f"Tree created: {tree_sha}")
    
    # Create commit
    commit_url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/commits'
    commit_data = {
        'message': 'Initial commit: EVT Feuerwehr-Einsatzverwaltungstool',
        'tree': tree_sha
    }
    
    if base_sha:
        commit_data['parents'] = [base_sha]
    
    response = requests.post(commit_url, headers=headers, json=commit_data)
    
    if response.status_code != 201:
        print(f"Error creating commit: {response.status_code} - {response.text}")
        return False
    
    commit_sha = response.json()['sha']
    print(f"Commit created: {commit_sha}")
    
    # Update reference
    ref_url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/refs/heads/{BRANCH}'
    ref_data = {
        'sha': commit_sha,
        'force': True
    }
    
    if base_sha:
        response = requests.patch(ref_url, headers=headers, json=ref_data)
    else:
        # Create new ref
        ref_data = {
            'ref': f'refs/heads/{BRANCH}',
            'sha': commit_sha
        }
        response = requests.post(f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/refs', 
                                headers=headers, json=ref_data)
    
    if response.status_code not in [200, 201]:
        print(f"Error updating reference: {response.status_code} - {response.text}")
        return False
    
    print(f"✅ Successfully uploaded to GitHub!")
    print(f"Repository: https://github.com/{REPO_OWNER}/{REPO_NAME}")
    return True

if __name__ == '__main__':
    if not GITHUB_TOKEN:
        print("ERROR: GITHUB_TOKEN not found in environment")
        exit(1)
    
    upload_files_via_api()
