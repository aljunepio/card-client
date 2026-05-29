export const cardTemplates = [
  {
    id: "standard",
    label: "Standard card",
    fields: [
      {
        id: "name",
        label: "NAME",
        placeholder: "Enter driver full name",
        y: 450,
      },
      {
        id: "idNumber",
        label: "ID NUMBER",
        placeholder: "Enter ID number",
        y: 510,
      },
      {
        id: "issueDate",
        label: "ISSUE DATE",
        placeholder: "DD-MMM-YYYY",
        y: 570,
      },
    ],
  },
  {
    id: "expiration",
    label: "Issue + Expiration",
    fields: [
      {
        id: "name",
        label: "NAME",
        placeholder: "Enter driver full name",
        y: 450,
      },
      {
        id: "idNumber",
        label: "ID NUMBER",
        placeholder: "Enter ID number",
        y: 500,
      },
      {
        id: "issueDate",
        label: "ISSUE DATE",
        placeholder: "DD-MMM-YYYY",
        y: 550,
      },
      {
        id: "expirationDate",
        label: "EXPIRY DATE",
        placeholder: "DD-MMM-YYYY",
        valueX: 290,
        y: 600,
      },
    ],
  },
];
