import csv

input_file = 'DebrisET_23_R02R05.csv'
output_file = 'test.csv'

with open(input_file, 'r', encoding='utf-8') as f_in, open(output_file, 'w', encoding='utf-8', newline='') as f_out:
    reader = csv.reader(f_in)
    writer = csv.writer(f_out)
    
    header = next(reader)
    writer.writerow(header)
    
    count = 0
    for row in reader:
        # row[1] is Value. Check if it's not '0'
        if len(row) >= 2 and row[1] != '0':
            writer.writerow(row)
            count += 1
            if count >= 100:
                break

print(f"Extracted {count} records to {output_file}")
