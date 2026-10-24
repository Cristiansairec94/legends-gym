import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def login_user(email=None, password=None):

    try:
        if not email or not password:
            return {"status": "error", "message": "Email and Password required"}

        if not frappe.db.exists("User", email):
            return {"status": "register", "message": "Account not found"}

        frappe.local.login_manager.authenticate(user=email, pwd=password)
        frappe.local.login_manager.post_login()

        roles = frappe.get_roles(email)

        is_admin = "System Manager" in roles or "Administrator" in roles

        return {
            "status": "success",
            "role": "admin" if is_admin else "user",
            "message": "Login Successful"
        }

    except frappe.AuthenticationError:
        return {"status": "invalid_password", "message": "Incorrect password"}

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Login API Error")
        return {"status": "error", "message": "Server error"}




@frappe.whitelist(allow_guest=True)
def register_user(member_name, email, password, mobile_number, gender=None, date_of_birth=None, address=None, emergency_contact=None):

    try:

        if frappe.db.exists("User", email):
            return {"status": "exists", "message": "Already exists"}

        user = frappe.get_doc({
            "doctype": "User",
            "email": email,
            "first_name": member_name,
            "enabled": 1,
            "new_password": password,
            "user_type": "Website User"
        })

        user.insert(ignore_permissions=True)
        user.add_roles("Member")

        member = frappe.get_doc({
            "doctype": "Gym Member",
            "member_name": member_name,
            "email": email,
            "mobile_number": mobile_number,
            "gender": gender,
            "dob": date_of_birth,
            "address": address,
            "emergency_contact": emergency_contact,
            "status": "Active",
            "joining_date": frappe.utils.today()
        })

        member.insert(ignore_permissions=True)

        frappe.db.commit()

        return {"status": "success", "message": "Created"}

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Register Error")
        return {"status": "error", "message": "Server error"}
    



@frappe.whitelist(allow_guest=True)
def logout_user():
    try:
        frappe.local.login_manager.logout()

        return {
            "status": "success",
            "message": "Logged out successfully"
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Logout Error")
        return {
            "status": "error",
            "message": "Logout failed"
        }