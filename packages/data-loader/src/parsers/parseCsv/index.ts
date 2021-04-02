import csvParse from "csv-parse/lib/sync";
import { KintoneFormFieldProperty } from "@kintone/rest-api-client";
import { PRIMARY_MARK } from "../../printers/printAsCsv/constants";
import { hasSubTable } from "../../printers/printAsCsv/hasSubTable";
import { extractSubTableFieldsValue } from "./extractSubTableFieldsValue";
import { groupByKintoneRecord } from "./groupByKintoneRecord";
import { isImportSupportedFieldType } from "./isImportSupportedFieldType";
import { formatToKintoneRecords } from "./formatToKintoneRecords";
import { formatToRecordValue } from "./formatToRecordValue";
import { CsvRecords, FieldsJson, ParsedRecord } from "../../types";

export const parseCsv = (
  csv: string,
  fieldsJson: { properties: Record<string, KintoneFormFieldProperty.OneOf> }
) => {
  const records: CsvRecords = csvParse(csv, {
    columns: true,
    skip_empty_lines: true,
  });
  return convertToKintoneRecords({
    records,
    fieldsJson,
  });
};

const buildSubTableRecord = ({
  primaryRow,
  fieldsJson,
  subTableFieldsValue,
}: {
  primaryRow: Record<string, string>;
  fieldsJson: FieldsJson;
  subTableFieldsValue: Record<string, any>;
}) => {
  return {
    ...Object.keys(primaryRow!)
      .filter((fieldCode) =>
        isImportSupportedFieldType(fieldsJson.properties[fieldCode]?.type)
      )
      .reduce((obj, fieldCode) => {
        const fieldType = fieldsJson.properties[fieldCode].type;
        return {
          ...obj,
          [fieldCode]: formatToRecordValue({
            fieldType,
            value: primaryRow![fieldCode],
          }),
        };
      }, {} as ParsedRecord),
    ...subTableFieldsValue,
  };
};

const convertToKintoneRecords = ({
  records,
  fieldsJson,
}: {
  records: CsvRecords;
  fieldsJson: FieldsJson;
}) => {
  if (!hasSubTable(fieldsJson)) {
    return formatToKintoneRecords({
      records,
      fieldsJson,
    });
  }

  const subTableRecordGroups = groupByKintoneRecord(records);

  return Object.keys(subTableRecordGroups).reduce<ParsedRecord[]>(
    (subTableRecords, index) => {
      const primaryRow = subTableRecordGroups[index].find(
        (record) => record[PRIMARY_MARK]
      );
      if (!primaryRow) {
        return subTableRecords;
      }
      const subTableFieldsValue = extractSubTableFieldsValue({
        records: subTableRecordGroups[index],
        fieldsJson,
      });

      const subTableRecord = buildSubTableRecord({
        primaryRow,
        fieldsJson,
        subTableFieldsValue,
      });
      return subTableRecords.concat([subTableRecord]);
    },
    []
  );
};
