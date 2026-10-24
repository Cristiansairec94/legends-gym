
import frappe

@frappe.whitelist()
def get_notifications(page=1, page_length=10):

    user = frappe.session.user

    if user == "Guest":
        return {"status": "guest"}

    page = int(page)
    page_length = int(page_length)

    data = frappe.get_all(
        "Notification Log",
        filters={"for_user": user},
        fields=[
            "name",
            "subject",
            "email_content",
            "creation",
            "read"
        ],
        order_by="creation desc",
        start=(page - 1) * page_length,
        page_length=page_length
    )

    total = frappe.db.count(
        "Notification Log",
        {"for_user": user}
    )

    return {
        "status": "success",
        "data": data,
        "total": total
    }



@frappe.whitelist()
def mark_notification_read(name):

    user = frappe.session.user

    if user == "Guest":
        return {
            "status": "guest"
        }

    exists = frappe.db.exists(
        "Notification Log",
        {
            "name": name,
            "for_user": user
        }
    )

    if not exists:
        return {
            "status": "error",
            "message": "Not allowed"
        }

    frappe.db.set_value(
        "Notification Log",
        name,
        "read",
        1
    )

    return {
        "status": "success"
    }




@frappe.whitelist()
def get_notification_detail(name):

    if frappe.session.user == "Guest":
        return {"status": "guest"}

    user = frappe.session.user

    doc = frappe.get_doc("Notification Log", name)

    if doc.for_user != user:
        return {"status": "error", "message": "Not allowed"}

    return {
        "status": "success",
        "data": {
            "title": doc.subject,
            "message": doc.email_content,
            "date": doc.creation,
            "read": doc.read
        }
    }