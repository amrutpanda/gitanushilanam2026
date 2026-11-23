"""Generate the static Quiz collection workbook. Requires openpyxl==3.1.5.

Run from any directory: python3 tools/generate-school-quiz-template.py
This authoring script is not part of the upload service; uploads never parse Excel.
"""
from pathlib import Path
from datetime import datetime
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.workbook.defined_name import DefinedName

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'downloads' / 'school-quiz-template.xlsx'
STATES = sorted([
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
    'Lakshadweep', 'Puducherry'
])
GROUPS = ['Sub-Junior (Class 3–5)', 'Junior (Class 6–8)', 'Senior (Class 9–12)', 'Youth / Adult (College / Adult)']
GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say']
NAVY, ORANGE, LIGHT, TEXT = '132840', 'FFBC57', 'FFF4D9', '172A42'

wb = Workbook()
wb.properties.title = 'Gitanushilanam 2026 School Quiz Template'
wb.properties.creator = 'Gitanushilanam Team'
wb.properties.created = datetime(2026, 11, 23)
wb.properties.modified = datetime(2026, 11, 23)
school = wb.active
school.title = 'School Details'
students = wb.create_sheet('Students')
lists = wb.create_sheet('Lists')
for column, (name, values) in enumerate([('IndianStates', STATES), ('ParticipantGroups', GROUPS), ('Genders', GENDERS)], 1):
    for row, value in enumerate(values, 1):
        lists.cell(row, column, value)
    letter = chr(64 + column)
    wb.defined_names.add(DefinedName(name, attr_text=f"'Lists'!${letter}$1:${letter}${len(values)}"))
lists.sheet_state = 'hidden'


def dropdown(sheet, cells, source, prompt):
    validation = DataValidation(type='list', formula1=f'={source}', allow_blank=True)
    validation.showDropDown = False
    validation.showInputMessage = True
    validation.showErrorMessage = True
    validation.errorStyle = 'stop'
    validation.errorTitle = 'Choose from the dropdown'
    validation.error = 'Please choose one of the available options.'
    validation.promptTitle = 'Select an option'
    validation.prompt = prompt
    sheet.add_data_validation(validation)
    validation.add(cells)


def merged_note(row, text, *, heading=False, height=36):
    school.merge_cells(start_row=row, start_column=1, end_row=row, end_column=7)
    cell = school.cell(row, 1, text)
    cell.font = Font(name='Calibri', size=12 if heading else 11, bold=heading, color='FFFFFF' if heading else TEXT)
    cell.fill = PatternFill('solid', fgColor=NAVY if heading else 'F3F6FA')
    cell.alignment = Alignment(vertical='center', wrap_text=True)
    school.row_dimensions[row].height = height


school.sheet_view.showGridLines = False
for column in 'ABCDEFG':
    school.column_dimensions[column].width = 18
school.column_dimensions['A'].width = 28
merged_note(1, 'GITANUSHILANAM 2026 · SCHOOL / COLLEGE QUIZ', heading=True, height=34)
merged_note(2, 'For Indian students · Bhagavad Gita Quiz only · Fill both visible sheets and upload the .xlsx file.', height=34)
merged_note(3, 'Enter the school name on the upload webpage. Fill the institution’s location below once for this workbook.', height=30)
for row, label in [(5, 'State / Union Territory'), (6, 'City')]:
    school.cell(row, 1, label).font = Font(name='Calibri', bold=True, color=TEXT)
    school.merge_cells(start_row=row, start_column=2, end_row=row, end_column=5)
    cell = school.cell(row, 2)
    cell.fill = PatternFill('solid', fgColor=LIGHT)
    cell.number_format = '@'
    cell.alignment = Alignment(vertical='center')
    school.row_dimensions[row].height = 30
dropdown(school, 'B5', 'IndianStates', 'Choose the school’s Indian state or Union Territory.')
merged_note(8, 'HOW TO FILL THE STUDENTS SHEET', heading=True, height=28)
instructions = [
    'Add one student per row. Use the dropdowns for Gender and Participant group. Do not rename sheets or column headers.',
    'Enter the student’s current age in completed years. If a parent fills the workbook, enter the child’s age.',
    'An email may repeat for students of the same institution. Use the intended registration email in each student row.',
    'A shared institution email must not already belong to an individual registration or a different institution.',
    'Each participant needs a different phone number, including across earlier registrations. Phone duplicates are checked during later processing.',
    'Phone and WhatsApp: enter 10 digits only, without +91, spaces or punctuation. Cells are text-formatted; +91 will be added during registration.',
    'WhatsApp may be the same as the student/parent phone. Complete all seven student fields. Do not enter a competition or referral-source column.',
    'Uploading collects the workbook only. Student registration and confirmation emails happen after later processing. State and city are also read later.'
]
for row, instruction in enumerate(instructions, 9):
    merged_note(row, instruction, height=32 if row not in [13, 14, 16] else 40)
merged_note(18, 'PARTICIPANT GROUPS · Choose by the student’s current class', heading=True, height=28)
for row, (group, age) in enumerate(zip(GROUPS, ['7–12 years', '10–15 years', '13–19 years', '16 years and above']), 19):
    merged_note(row, f'{group} — {age}', height=26)
merged_note(24, 'The ranges overlap intentionally. Use the student’s current class to select the group. Dropdowns do not replace later validation.', height=36)
school.print_options.horizontalCentered = True
school.print_area = 'A1:G24'
school.sheet_properties.pageSetUpPr.fitToPage = True
school.page_setup.orientation = 'portrait'
school.page_setup.paperSize = school.PAPERSIZE_A4
school.page_setup.fitToWidth = 1
school.page_setup.fitToHeight = 1

headers = ['Student name', 'Gender', 'Age', 'Participant group', 'Registration email', 'Phone (10 digits)', 'WhatsApp (10 digits)']
students.append(headers)
for cell in students[1]:
    cell.font = Font(name='Calibri', bold=True, color='FFFFFF', size=11)
    cell.fill = PatternFill('solid', fgColor=NAVY)
    cell.alignment = Alignment(wrap_text=True, vertical='center')
students.row_dimensions[1].height = 34
for column, width in zip('ABCDEFG', [28, 23, 10, 38, 36, 24, 26]):
    students.column_dimensions[column].width = width
    if column in 'ABDEFG':
        students.column_dimensions[column].number_format = '@'
for row in students.iter_rows(min_row=2, max_row=1001, max_col=7):
    for cell in row:
        cell.font = Font(name='Calibri', size=11, color=TEXT)
        cell.number_format = '0' if cell.column == 3 else '@'
        cell.alignment = Alignment(vertical='center')
        cell.fill = PatternFill('solid', fgColor='FFFFFF' if cell.row % 2 else 'F3F6FA')
        cell.border = Border(bottom=Side(style='hair', color='E1E7EE'))
dropdown(students, 'B2:B1048576', 'Genders', 'Choose the student’s gender.')
dropdown(students, 'D2:D1048576', 'ParticipantGroups', 'Select by current class. See School Details for age ranges.')
age = DataValidation(type='whole', operator='between', formula1=7, formula2=120, allow_blank=True)
age.showErrorMessage = True
age.errorTitle = 'Enter a whole-number age'
age.error = 'Enter the student’s age in completed years, from 7 to 120. Check the group age range on School Details.'
age.showInputMessage = True
age.prompt = 'Enter the student’s age. Check the age ranges on School Details.'
students.add_data_validation(age)
age.add('C2:C1048576')
students.freeze_panes = 'A2'
students.auto_filter.ref = 'A1:G1001'
students.sheet_view.showGridLines = False
students.print_title_rows = '1:1'
students.sheet_properties.pageSetUpPr.fitToPage = True
students.page_setup.orientation = 'landscape'
students.page_setup.fitToWidth = 1
students.page_setup.fitToHeight = 0
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUTPUT)

# Check the downloadable artifact itself, including dropdown references and text formatting.
check = load_workbook(OUTPUT)
assert [s.title for s in check if s.sheet_state == 'visible'] == ['School Details', 'Students']
assert len(STATES) == len(set(STATES)) == 36
assert [c.value for c in check['Students'][1]] == headers
assert check['School Details']['B5'].value is None and check['School Details']['B6'].value is None
assert check['Students']['F2'].number_format == check['Students']['G1001'].number_format == '@'
assert all(cell.value is None for row in check['Students'].iter_rows(min_row=2) for cell in row)
assert any(d.formula1 == '=ParticipantGroups' and not d.showDropDown for d in check['Students'].data_validations.dataValidation)
assert any(d.formula1 == '=Genders' for d in check['Students'].data_validations.dataValidation)
assert any(d.formula1 == '=IndianStates' for d in check['School Details'].data_validations.dataValidation)
assert check['Lists'].sheet_state == 'hidden'
print(f'Created and verified {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)')
