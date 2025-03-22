from docx import Document
import tkinter as tk
from tkinter import filedialog, ttk, messagebox

def extract_text_from_docx(file_path):
    """Extracts table data from a Word document."""
    doc = Document(file_path)
    tables_data = []
    for table in doc.tables:
        table_content = [[cell.text.strip() for cell in row.cells] for row in table.rows]
        tables_data.append(table_content)
    return tables_data

def format_timetable(table_data):
    """Formats extracted timetable table into a dictionary."""
    timetable = {}
    headers = table_data[0][1:]  # Assuming first row is header
    for row in table_data[1:]:  # Skipping header row
        if row:
            day = row[0]
            classes = row[1:]
            timetable[day] = {headers[i]: classes[i] for i in range(len(classes))}
    return timetable

def display_schedule(timetable, frame):
    """Displays the formatted timetable in a Tkinter GUI."""
    columns = ["Day"] + list(next(iter(timetable.values())).keys())
    tree = ttk.Treeview(frame, columns=columns, show="headings")

    # Define column headings
    for col in columns:
        tree.heading(col, text=col)
        tree.column(col, width=180, anchor=tk.CENTER)

    # Insert timetable data into the treeview
    for day, schedule in timetable.items():
        row_data = [day] + [schedule.get(time, "") for time in columns[1:]]
        tree.insert("", "end", values=row_data)

    tree.pack(fill=tk.BOTH, expand=True)

def open_file():
    """Prompts the user to open a .docx file and returns the formatted timetable."""
    file_path = filedialog.askopenfilename(filetypes=[("Word Documents", "*.docx")])
    if file_path:
        tables_data = extract_text_from_docx(file_path)
        if tables_data:
            formatted_timetable = format_timetable(tables_data[0])
            return formatted_timetable
    return {}

def ask_for_second_schedule(user_timetable):
    """Prompts the user to open the second timetable file."""
    file_path = filedialog.askopenfilename(filetypes=[("Word Documents", "*.docx")])
    if file_path:
        tables_data = extract_text_from_docx(file_path)
        if tables_data:
            formatted_timetable = format_timetable(tables_data[0])
            return formatted_timetable
    return {}

def check_for_group_study(user_timetable, p1_timetable, class_name="CTS"):
    """Checks if the user and p1 have CTS at the same time and suggests group study."""
    for day, schedule in user_timetable.items():
        if day in p1_timetable:
            for time, subject in schedule.items():
                if subject.lower() == class_name.lower():
                    # Check if the same time exists in p1's timetable
                    for p1_time, p1_subject in p1_timetable[day].items():
                        if p1_subject.lower() == class_name.lower() and p1_time == time:
                            messagebox.askyesno("Group Study", f"You and p1 have {class_name} at the same time ({time}). Do you want to form a group study?")
                            return

# Tkinter Main Window
root = tk.Tk()
root.title("Schedule Loader")
root.geometry("600x400")

ttk.Label(root, text="Select first .docx file to load schedule:").pack(pady=10)
frame1 = ttk.Frame(root, padding=10)
frame1.pack(fill=tk.BOTH, expand=True)

def load_first_schedule():
    """Load the first schedule and display it."""
    user_timetable = open_file()
    if user_timetable:
        display_schedule(user_timetable, frame1)
        p1_timetable = ask_for_second_schedule(user_timetable)
        if p1_timetable:
            frame2 = ttk.Frame(root, padding=10)
            frame2.pack(fill=tk.BOTH, expand=True)
            display_schedule(p1_timetable, frame2)
            check_for_group_study(user_timetable, p1_timetable)  # Check for group study

ttk.Button(root, text="Open First Schedule", command=load_first_schedule).pack(pady=10)

root.mainloop()