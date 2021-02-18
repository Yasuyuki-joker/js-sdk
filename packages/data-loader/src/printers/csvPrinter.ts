import { KintoneRecordField } from "@kintone/rest-api-client";

type KintoneRecords = Array<{ [k: string]: KintoneRecordField.OneOf }>;

const LINE_BREAK = "\n";
const SEPARATOR = ",";

const isSupportedFieldType = (field: KintoneRecordField.OneOf) => {
  const supportedFieldTypes = [
    "RECORD_NUMBER",
    "SINGLE_LINE_TEXT",
    "RADIO_BUTTON",
    "MULTI_LINE_TEXT",
    "NUMBER",
    "RICH_TEXT",
    "LINK",
    "DROP_DOWN",
    "CALC",
    "CREATOR",
    "MODIFIER",
    "UPDATED_TIME",
    "CREATED_TIME",
    "MULTI_SELECT",
    "CHECK_BOX",
  ];
  return supportedFieldTypes.includes(field.type);
};

const zeroPad = (num: number) => (num + "").padStart(2, "0");

/**
 * format: "YYYY/MM/DD HH:mm"
 */
const formatDateFieldValue = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.getFullYear()}/${zeroPad(date.getMonth() + 1)}/${zeroPad(
    date.getDate()
  )} ${zeroPad(date.getHours())}:${zeroPad(date.getMinutes())}`;
};

const escapeQuotation = (fieldValue: string) => fieldValue.replace(/"/g, '""');

const encloseInQuotation = (fieldValue: string | null) =>
  `"${fieldValue ? escapeQuotation(fieldValue) : ""}"`;

const extractFieldCodes = (records: KintoneRecords) => {
  const firstRecord = records.slice().shift();
  if (!firstRecord) return [];
  return Object.keys(firstRecord).filter((key) =>
    isSupportedFieldType(firstRecord[key])
  );
};

const lexer = (field: KintoneRecordField.OneOf) => {
  switch (field.type) {
    case "RECORD_NUMBER":
    case "SINGLE_LINE_TEXT":
    case "RADIO_BUTTON":
    case "MULTI_LINE_TEXT":
    case "NUMBER":
    case "RICH_TEXT":
    case "LINK":
    case "DROP_DOWN":
    case "CALC":
      return encloseInQuotation(field.value);
    case "CREATOR":
    case "MODIFIER":
      return encloseInQuotation(field.value.code);
    case "UPDATED_TIME":
    case "CREATED_TIME":
      return encloseInQuotation(formatDateFieldValue(field.value));
    case "MULTI_SELECT":
    case "CHECK_BOX":
      return encloseInQuotation(JSON.stringify(field.value));
    default:
      return field.value;
  }
};

export const convertKintoneRecordsToCsv = (records: KintoneRecords) => {
  const fieldCodes = extractFieldCodes(records);

  const header = fieldCodes
    .map((fieldCode) => encloseInQuotation(fieldCode))
    .join(SEPARATOR);

  const rows = records
    .slice()
    .reverse()
    .map((record) => {
      return fieldCodes
        .map((fieldCode) => lexer(record[fieldCode]))
        .join(SEPARATOR);
    });

  return (
    [header, ...rows].join(LINE_BREAK).replace(/\r?\n/gm, LINE_BREAK) +
    LINE_BREAK
  );
};

export const csvPrinter = (
  records: Array<{ [k: string]: KintoneRecordField.OneOf }>
) => {
  console.log(convertKintoneRecordsToCsv(records));
};
