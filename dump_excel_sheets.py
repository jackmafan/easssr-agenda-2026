import pandas as pd
import os

def excel_to_csv(excel_file):
    # Read the excel file
    xls = pd.ExcelFile(excel_file)
    
    # Create an output directory if you want, or just dump in current dir
    # For now, let's dump in the same directory
    base_name = os.path.splitext(excel_file)[0]
    
    for sheet_name in xls.sheet_names:
        print(f"Processing sheet: {sheet_name}")
        df = pd.read_excel(xls, sheet_name=sheet_name)
        
        # Clean sheet name for filename (remove invalid characters if any)
        clean_sheet_name = "".join([c for c in sheet_name if c.isalnum() or c in (' ', '_', '-')]).strip()
        output_file = f"{clean_sheet_name}.csv"
        
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        print(f"Saved to {output_file}")

if __name__ == "__main__":
    excel_file = "EASSSR議程_0420.xlsx"
    if os.path.exists(excel_file):
        excel_to_csv(excel_file)
    else:
        print(f"File {excel_file} not found.")
