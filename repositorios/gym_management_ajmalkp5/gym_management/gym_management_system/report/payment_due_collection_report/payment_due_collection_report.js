frappe.query_reports["Payment Due & Collection Report"] = {
    filters: [
        {
            fieldname: "due_date",
            label: "Due Date",
            fieldtype: "Date"
        },
        {
            fieldname: "status",
            label: "Payment Status",
            fieldtype: "Select",
            options: "\nPaid\nPartial\nUnpaid\nOverdue"
        },
        {
            fieldname: "plan",
            label: "Membership Plan",
            fieldtype: "Link",
            options: "Gym Membership Plan"
        }
    ]
};