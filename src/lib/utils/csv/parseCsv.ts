export type CsvDelimiter = "," | ";" | "\t" | "|";

const candidateDelimiters: CsvDelimiter[] = [",", ";", "\t", "|"];

export const detectCsvDelimiter = (textSample: string): CsvDelimiter => {
  const firstLine = textSample.split(/\r?\n/)[0] ?? "";
  let best: CsvDelimiter = ",";
  let bestCount = -1;

  for (const delimiter of candidateDelimiters) {
    const count = firstLine.split(delimiter).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  }

  return best;
};

export const parseCsv = (input: string, delimiter: CsvDelimiter): string[][] => {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];

  let row: string[] = [];
  let field = "";
  let isInQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    // Skip completely empty trailing row
    const hasAnyValue = row.some((value) => value.trim().length > 0);
    if (row.length > 0 && hasAnyValue) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;

    if (isInQuotes) {
      if (char === "\"") {
        const nextChar = text[index + 1];
        if (nextChar === "\"") {
          field += "\"";
          index += 1;
        } else {
          isInQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      isInQuotes = true;
      continue;
    }

    if (char === delimiter) {
      pushField();
      continue;
    }

    if (char === "\n") {
      pushField();
      pushRow();
      continue;
    }

    if (char === "\r") {
      const nextChar = text[index + 1];
      if (nextChar === "\n") {
        index += 1;
      }
      pushField();
      pushRow();
      continue;
    }

    field += char;
  }

  pushField();
  pushRow();

  return rows;
};

