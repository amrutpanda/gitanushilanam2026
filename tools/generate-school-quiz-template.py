"""Generate the static Quiz collection workbook. Requires openpyxl==3.1.5.

Run from any directory: python3 tools/generate-school-quiz-template.py
This authoring script is not part of the upload service; uploads never parse Excel.
"""
from pathlib import Path
from datetime import datetime
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.views import Selection

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

# One entry sheet, one guide sheet; no separate Lists tab or cross-sheet dropdown references.
HEADER_ROW, FIRST_ROW, LAST_ROW = 7, 8, 1007
wb = Workbook()
wb.properties.title = 'Gitanushilanam 2026 School Quiz Template'
wb.properties.creator = 'Gitanushilanam Team'
wb.properties.created = datetime(2026, 11, 23)
wb.properties.modified = datetime(2026, 11, 23)
students = wb.active
students.title = 'Students'
guide = wb.create_sheet('Instructions')


def dropdown(cells, formula, prompt):
    validation = DataValidation(type='list', formula1=formula, allow_blank=True)
    # In OOXML, true hides the dropdown arrow (despite this property's name).
    validation.showDropDown = False
    validation.showInputMessage = True
    validation.showErrorMessage = True
    validation.errorStyle = 'stop'
    validation.errorTitle = 'Choose a listed option'
    validation.error = 'Choose from the dropdown or type an option exactly as shown in Instructions.'
    validation.promptTitle = 'Select an option'
    validation.prompt = prompt
    students.add_data_validation(validation)
    validation.add(cells)


def inline_list(values):
    # Excel inline validation lists must stay within 255 characters.
    result = '"' + ','.join(values) + '"'
    assert len(result) <= 255 and all(',' not in value and '"' not in value for value in values)
    return result


def note(sheet, row, text, *, heading=False, height=30):
    sheet.merge_cells(start_row=row, start_column=1, end_row=row, end_column=7)
    cell = sheet.cell(row, 1, text)
    cell.font = Font(name='Calibri', size=12 if heading else 11, bold=heading, color='FFFFFF' if heading else TEXT)
    cell.fill = PatternFill('solid', fgColor=NAVY if heading else 'F3F6FA')
    cell.alignment = Alignment(vertical='center', wrap_text=True)
    sheet.row_dimensions[row].height = height


students.sheet_view.showGridLines = False
for column, width in zip('ABCDEFG', [28, 38, 10, 38, 36, 24, 26]):
    students.column_dimensions[column].width = width
    if column in 'ABDEFG':
        students.column_dimensions[column].number_format = '@'
note(students, 1, 'GITANUSHILANAM 2026 · SCHOOL / COLLEGE QUIZ', heading=True, height=34)
note(students, 2, 'Fill state and city once below. Enter the school name on the upload webpage. All students in this file use this location.')
for row, label in [(3, 'State / Union Territory'), (4, 'City')]:
    students.cell(row, 1, label).font = Font(name='Calibri', bold=True, color=TEXT)
    # Keep input cells unmerged for straightforward selection in mobile spreadsheet apps.
    cell = students.cell(row, 2)
    cell.fill = PatternFill('solid', fgColor=LIGHT)
    cell.border = Border(bottom=Side(style='thin', color=ORANGE))
    cell.number_format = '@'
    cell.alignment = Alignment(vertical='center')
    students.row_dimensions[row].height = 30
# The state list exceeds Excel's inline-list limit. Keep its cells on this same
# sheet in a hidden column, avoiding named ranges and an extra helper sheet.
for row, state in enumerate(STATES, 1):
    students.cell(row, 9, state)
students.column_dimensions['I'].hidden = True
dropdown('B3', '$I$1:$I$36', 'Choose the school’s Indian state or Union Territory.')
note(students, 6, 'Start students on row 8. Select a Gender or Participant group cell for its dropdown. See Instructions for help and age ranges.')
headers = ['Student name', 'Gender', 'Age', 'Participant group', 'Registration email', 'Phone (10 digits)', 'WhatsApp (10 digits)']
for column, header in enumerate(headers, 1):
    cell = students.cell(HEADER_ROW, column, header)
    cell.font = Font(name='Calibri', bold=True, color='FFFFFF', size=11)
    cell.fill = PatternFill('solid', fgColor=NAVY)
    cell.alignment = Alignment(wrap_text=True, vertical='center')
students.row_dimensions[HEADER_ROW].height = 34
for row in students.iter_rows(min_row=FIRST_ROW, max_row=LAST_ROW, max_col=7):
    for cell in row:
        cell.font = Font(name='Calibri', size=11, color=TEXT)
        cell.number_format = '0' if cell.column == 3 else '@'
        cell.alignment = Alignment(vertical='center')
        cell.fill = PatternFill('solid', fgColor='FFFFFF' if cell.row % 2 else 'F3F6FA')
        cell.border = Border(bottom=Side(style='hair', color='E1E7EE'))
dropdown(f'B{FIRST_ROW}:B{LAST_ROW}', inline_list(GENDERS), 'Choose the student’s gender.')
dropdown(f'D{FIRST_ROW}:D{LAST_ROW}', inline_list(GROUPS), 'Choose by current class. See Instructions for age ranges.')
age = DataValidation(type='whole', operator='between', formula1=7, formula2=120, allow_blank=True)
age.showErrorMessage = True
age.errorStyle = 'stop'
age.errorTitle = 'Enter a whole-number age'
age.error = 'Enter the student’s age in completed years, from 7 to 120. Check the group age range in Instructions.'
age.showInputMessage = True
age.prompt = 'Enter the student’s age. Check the age ranges in Instructions.'
students.add_data_validation(age)
age.add(f'C{FIRST_ROW}:C{LAST_ROW}')
students.freeze_panes = f'A{FIRST_ROW}'
# Open at the first location input, not at a hidden list or the bottom of the form.
students.sheet_view.selection = [Selection(pane='topLeft', activeCell='B3', sqref='B3'), Selection(pane='bottomLeft', activeCell='A8', sqref='A8')]
students.sheet_view.pane.activePane = 'topLeft'
students.auto_filter.ref = f'A{HEADER_ROW}:G{LAST_ROW}'
students.print_title_rows = f'{HEADER_ROW}:{HEADER_ROW}'
students.print_area = f'A1:G{LAST_ROW}'
students.sheet_properties.pageSetUpPr.fitToPage = True
students.page_setup.orientation = 'landscape'
students.page_setup.fitToWidth = 1
students.page_setup.fitToHeight = 0

for column in 'ABCDEFG':
    guide.column_dimensions[column].width = 18
guide.sheet_view.showGridLines = False
note(guide, 1, 'HOW TO FILL YOUR SCHOOL / COLLEGE QUIZ WORKBOOK', heading=True, height=34)
instructions = [
    'Use only Students for data entry. State is cell B3 and city is B4; enter each once for the whole file. Enter the school name on the upload webpage.',
    'Add one student per row, starting on row 8. This template has 1,000 student rows. Use another copy for more students or a different location.',
    'Open the .xlsx file in a spreadsheet app and enable editing if prompted. Select a Gender, Participant group or State entry cell to show its dropdown.',
    'If your mobile app does not show the choices, type an option exactly as listed below or open the file in desktop Excel. Do not rename sheets or column headers.',
    'Enter the student’s current age in completed years. If a parent fills the workbook, enter the child’s age. Choose the group by the student’s current class.',
    'An email may repeat for students of the same institution. Use the intended registration email in each student row.',
    'A shared institution email must not already belong to an individual registration or a different institution.',
    'Each participant needs a different phone number, including across earlier registrations. Phone duplicates are checked during later processing.',
    'Phone and WhatsApp: enter 10 digits only, without +91, spaces or punctuation. Cells are text-formatted; +91 will be added during registration.',
    'WhatsApp may be the same as the student/parent phone. Complete all seven student fields. This is for Indian students and Bhagavad Gita Quiz only.',
    'Save as .xlsx, then upload (maximum 2 MB). Uploading collects the workbook only. Student registration and confirmation emails happen after later processing.'
]
for row, instruction in enumerate(instructions, 3):
    note(guide, row, instruction, height=42)
note(guide, 15, 'PARTICIPANT GROUPS · Select the label before the age range', heading=True)
for row, (group, age_range) in enumerate(zip(GROUPS, ['7–12 years', '10–15 years', '13–19 years', '16 years and above']), 16):
    note(guide, row, f'{group} — {age_range}')
note(guide, 20, 'The ranges overlap intentionally. Choose by current class. Dropdowns do not replace later validation.', height=36)
note(guide, 22, 'GENDER OPTIONS', heading=True)
for row, gender in enumerate(GENDERS, 23):
    note(guide, row, gender, height=24)
note(guide, 28, 'STATE / UNION TERRITORY OPTIONS', heading=True)
for row, state in enumerate(STATES, 29):
    note(guide, row, state, height=24)
guide.print_area = f'A1:G{28 + len(STATES)}'
guide.sheet_properties.pageSetUpPr.fitToPage = True
guide.page_setup.orientation = 'portrait'
guide.page_setup.paperSize = guide.PAPERSIZE_A4
guide.page_setup.fitToWidth = 1
guide.page_setup.fitToHeight = 0
wb.active = 0
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUTPUT)

# Verify the actual downloadable artifact, especially dropdown sources and blank input cells.
check = load_workbook(OUTPUT)
assert check.sheetnames == ['Students', 'Instructions'] and check.active.title == 'Students'
assert len(STATES) == len(set(STATES)) == 36
sheet = check['Students']
assert [sheet.cell(HEADER_ROW, column).value for column in range(1, 8)] == headers
assert sheet['B3'].value is None and sheet['B4'].value is None
assert sheet['F8'].number_format == sheet[f'G{LAST_ROW}'].number_format == '@'
assert all(cell.value is None for row in sheet.iter_rows(min_row=FIRST_ROW, max_row=LAST_ROW, max_col=7) for cell in row)
assert sheet.column_dimensions['I'].hidden
assert [sheet.cell(row, 9).value for row in range(1, 37)] == STATES
for cell, formula in [('B3', '$I$1:$I$36'), ('B8', inline_list(GENDERS)), ('D8', inline_list(GROUPS))]:
    rule = next(rule for rule in sheet.data_validations.dataValidation if cell in rule)
    assert rule.type == 'list' and rule.formula1 == formula and not rule.showDropDown and rule.showErrorMessage
    assert cell not in sheet.merged_cells
assert sheet.freeze_panes == 'A8' and sheet.auto_filter.ref == f'A7:G{LAST_ROW}'
print(f'Created and verified {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)')
