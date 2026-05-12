import pandas as pd
import json
import re
import os

def clean_text(text):
    if pd.isna(text):
        return ""
    text = str(text)
    # Remove Excel's carriage return artifact
    text = text.replace("_x000D_", "\n")
    # Clean up multiple newlines or spaces if needed
    text = re.sub(r'\n\s*\n', '\n\n', text)
    return text.strip()

def parse_data():
    # 1. Load Papers from 原始名單.csv
    papers_df = pd.read_csv("原始名單.csv")
    papers = {}
    
    for _, row in papers_df.iterrows():
        paper_id = str(row['Original']).strip()
        title = clean_text(row['Paper Title'])
        abstract = clean_text(row['Abstract (300 to 500 words)'])
        speaker_first = str(row['Name (First)']).strip()
        speaker_last = str(row['Name (Last)']).strip()
        speaker = f"{speaker_first} {speaker_last}"
        affiliation = str(row['Organizational Affiliation']).strip()
        
        co_authors = []
        if str(row.get('Is there a co-author(s) in your paper?', '')).lower() == 'yes':
            for i in range(2, 5):
                prefix = f"Second" if i==2 else ("Third" if i==3 else "Fourth")
                first = str(row.get(f"{prefix} author's name (First)", "")).strip()
                last = str(row.get(f"{prefix} author's name (Last)", "")).strip()
                if first and first != "nan" and first != "":
                    co_authors.append(f"{first} {last}")
        
        papers[paper_id] = {
            "id": paper_id,
            "title": title,
            "speaker": speaker,
            "affiliation": affiliation,
            "abstract": abstract,
            "co_authors": co_authors,
            "deprecated": False
        }

    # 2. Load Schedule from 議程大列表.csv
    agenda_df = pd.read_csv("議程大列表.csv")
    
    agenda = []
    current_day = None
    current_time = None
    current_session = None

    for _, row in agenda_df.iterrows():
        day = str(row['Day']).strip()
        date = str(row['Date']).strip()
        time = str(row['Time']).strip()
        room = str(row['Room']).strip() if pd.notna(row['Room']) else ""
        prog = clean_text(row['Programme'])
        
        # If it's a paper entry (starts with digit* or contains *)
        paper_match = re.match(r"(\d+)\*", prog)
        if paper_match:
            pid = paper_match.group(1)
            if current_session:
                current_session["papers"].append(pid)
            continue
            
        # If it's a new day/time slot or room
        # We need to structure this by Day -> Time Slot -> Room Session
        
        # Check if day changed
        day_entry = next((d for d in agenda if d["day"] == day), None)
        if not day_entry:
            day_entry = {"day": day, "date": date, "slots": []}
            agenda.append(day_entry)
            
        # Check if time slot changed
        slot_entry = next((s for s in day_entry["slots"] if s["time"] == time), None)
        if not slot_entry:
            slot_entry = {"time": time, "sessions": []}
            day_entry["slots"].append(slot_entry)
            
        # Create a session
        session = {
            "room": room,
            "title": prog if not paper_match else prog.split('\n')[0], # Keep full text for special events
            "papers": []
        }
        slot_entry["sessions"].append(session)
        current_session = session

    return {"papers": papers, "agenda": agenda}

if __name__ == "__main__":
    result = parse_data()
    with open("agenda_data.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print("agenda_data.json generated successfully.")
