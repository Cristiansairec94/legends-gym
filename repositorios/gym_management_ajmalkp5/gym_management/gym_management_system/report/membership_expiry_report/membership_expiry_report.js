// Copyright (c) 2026, Ajmal Kp and contributors
// For license information, please see license.txt


frappe.query_reports["Membership Expiry Report"] = {
    filters: [
        {
            fieldname: "from_date",
            label: "From Date",
            fieldtype: "Date"
        },
        {
            fieldname: "to_date",
            label: "To Date",
            fieldtype: "Date"
        },
        {
            fieldname: "status",
            label: "Status",
            fieldtype: "Select",
            options: "\nActive\nExpired\nHold\nFrozen"
        },
        {
            fieldname: "plan",
            label: "Membership Plan",
            fieldtype: "Link",
            options: "Membership Plan"
        }
    ]
};