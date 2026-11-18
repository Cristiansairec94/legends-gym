# Copyright (c) 2013, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt


import frappe
from frappe import _, scrub
from frappe.utils import add_days, add_to_date, flt, getdate
from six import iteritems

from erpnext.accounts.utils import get_fiscal_year


def execute(filters=None):
	# columns = [{
	# 		"fieldname": "account",
	# 		"label": _("Account"),
	# 		"fieldtype": "Data",
	# 		"options": "Account",
	# 		"width": 300
	# 	},
	# 	{
	# 		"fieldname": "currency",
	# 		"label": _("Currency"),
	# 		"fieldtype": "Data",
	# 		"options": "Currency",
	# 		"width": 300
	# 	}]
	# data = [{
	# 			"account": "report",
	# 			"currency": "Balance Sheet",
	# 		}]
	# return columns, data
	return Analytics(filters).run()

class Analytics(object):
	def __init__(self, filters=None):
		self.filters = frappe._dict(filters or {})
		self.date_field = "date"
		self.months = [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
		]
		self.get_period_date_ranges()

	def run(self):
		self.get_columns()
		self.get_data()
		self.get_chart_data()

		# Skipping total row for tree-view reports
		skip_total_row = 1

		# if self.filters.tree_type in ["Supplier Group", "Item Group", "Customer Group", "Territory"]:
		# 	skip_total_row = 1

		# return self.columns, self.data, None, self.chart, None, skip_total_row
		return self.columns, self.data, None, self.chart

	def get_columns(self):
		self.columns = [
			{
				"label": _("Membership No"),
				"options": "Gym Member",
				"fieldname": "entity",
				"fieldtype": "Link",
				"width": 140,
			},
			{
				"label": _("Member Name"),
				"fieldname": "entity_name",
				"fieldtype": "Data",
				"width": 140,
			}
		]
		for end_date in self.periodic_daterange:
			period = self.get_period(end_date)
			self.columns.append(
				{"label": _(period), "fieldname": scrub(period), "fieldtype": "Float", "width": 120}
			)

		self.columns.append(
			{"label": _("Total"), "fieldname": "total", "fieldtype": "Float", "width": 120}
		)

	def get_data(self):
		self.get_gym_members()
		self.get_rows()
	
		# if self.filters.tree_type in ["Customer", "Supplier"]:
		# 	self.get_sales_transactions_based_on_customers_or_suppliers()
		# 	self.get_rows()

		# elif self.filters.tree_type == "Item":
		# 	self.get_sales_transactions_based_on_items()
		# 	self.get_rows()

		# elif self.filters.tree_type in ["Customer Group", "Supplier Group", "Territory"]:
		# 	self.get_sales_transactions_based_on_customer_or_territory_group()
		# 	self.get_rows_by_group()

		# elif self.filters.tree_type == "Item Group":
		# 	self.get_sales_transactions_based_on_item_group()
		# 	self.get_rows_by_group()

		# elif self.filters.tree_type == "Order Type":
		# 	if self.filters.doc_type != "Sales Order":
		# 		self.data = []
		# 		return
		# 	self.get_sales_transactions_based_on_order_type()
		# 	self.get_rows_by_group()

		# elif self.filters.tree_type == "Project":
		# 	self.get_sales_transactions_based_on_project()
		# 	self.get_rows()

	def get_gym_members(self):

		self.entries = frappe.db.sql(
			"""
			SELECT 
				gmw.membership_no, 
				gmhs.date,
				gmhs.weight_kg, 
				gm.name, gm.first_name, gm.last_name 
			FROM
				`tabGym Member Weight` gmw , `tabGym Member Health Stats` gmhs, `tabGym Member` gm
			WHERE
				gmw.membership_no = gm.name and gmw.name = gmhs.parent 
			""",
			as_dict=1,
		)

		self.entity_names = {}
		for d in self.entries:
			self.entity_names.setdefault(d.membership_no, d.first_name + " " + d.last_name)


	def get_rows(self):
		self.data = []
		self.get_periodic_data()

		for entity, period_data in iteritems(self.entity_periodic_data):
			row = {
				"entity": entity,
				# "entity_name": self.entity_names.get(entity) if hasattr(self, "entity_names") else None,
				"entity_name": self.entity_names.get(entity),
			}
			total = 0
			for end_date in self.periodic_daterange:
				period = self.get_period(end_date)
				amount = flt(period_data.get(period, 0.0))
				row[scrub(period)] = amount
				total += amount

			row["total"] = total

			self.data.append(row)

	def get_periodic_data(self):
		self.entity_periodic_data = frappe._dict()

		period_no = {}
		period_total = {}
		for d in self.entries:
			# if self.filters.tree_type == "Supplier Group":
			# 	d.entity = self.parent_child_map.get(d.entity)
			# period = self.get_period(d.get(self.date_field))

			d.entity = d.membership_no

			period = self.get_period(d.date)
			period_no.setdefault(period, 0)
			period_total.setdefault(period, 0)
			period_no[period] += 1
			period_total[period] += flt(d.weight_kg)
			self.entity_periodic_data.setdefault(d.entity, frappe._dict()).setdefault(period, 0.0)
			self.entity_periodic_data[d.entity][period] = period_total[period] / period_no[period]

			# if self.filters.tree_type == "Item":
			# 	self.entity_periodic_data[d.entity]["stock_uom"] = d.stock_uom

	def get_period(self, posting_date):
		if self.filters.range == "Weekly":
			period = "Week " + str(posting_date.isocalendar()[1]) + " " + str(posting_date.year)
		elif self.filters.range == "Monthly":
			period = str(self.months[posting_date.month - 1]) + " " + str(posting_date.year)
		elif self.filters.range == "Quarterly":
			period = "Quarter " + str(((posting_date.month - 1) // 3) + 1) + " " + str(posting_date.year)
		else:
			year = get_fiscal_year(posting_date, company=self.filters.company)
			period = str(year[0])
		return period

	def get_period_date_ranges(self):
		from dateutil.relativedelta import MO, relativedelta

		from_date, to_date = getdate(self.filters.from_date), getdate(self.filters.to_date)

		increment = {"Monthly": 1, "Quarterly": 3, "Half-Yearly": 6, "Yearly": 12}.get(
			self.filters.range, 1
		)

		if self.filters.range in ["Monthly", "Quarterly"]:
			from_date = from_date.replace(day=1)
		elif self.filters.range == "Yearly":
			from_date = get_fiscal_year(from_date)[1]
		else:
			from_date = from_date + relativedelta(from_date, weekday=MO(-1))

		self.periodic_daterange = []
		for dummy in range(1, 53):
			if self.filters.range == "Weekly":
				period_end_date = add_days(from_date, 6)
			else:
				period_end_date = add_to_date(from_date, months=increment, days=-1)

			if period_end_date > to_date:
				period_end_date = to_date

			self.periodic_daterange.append(period_end_date)

			from_date = add_days(period_end_date, 1)
			if period_end_date == to_date:
				break

	def get_supplier_parent_child_map(self):
		self.parent_child_map = frappe._dict(
			frappe.db.sql(""" select name, supplier_group from `tabSupplier`""")
		)

	def get_chart_data(self):
		length = len(self.columns)

		# if self.filters.tree_type in ["Customer", "Supplier"]:
		# 	labels = [d.get("label") for d in self.columns[2 : length - 1]]
		# elif self.filters.tree_type == "Item":
		# 	labels = [d.get("label") for d in self.columns[3 : length - 1]]
		# else:
		# 	labels = [d.get("label") for d in self.columns[1 : length - 1]]
		labels = [d.get("label") for d in self.columns[2 : length - 1]]
		self.chart = {"data": {"labels": labels, "datasets": []}, "type": "line"}

		# if self.filters["value_quantity"] == "Value":
		# 	self.chart["fieldtype"] = "Currency"
		# else:
		# 	self.chart["fieldtype"] = "Float"
		self.chart["fieldtype"] = "Float"

