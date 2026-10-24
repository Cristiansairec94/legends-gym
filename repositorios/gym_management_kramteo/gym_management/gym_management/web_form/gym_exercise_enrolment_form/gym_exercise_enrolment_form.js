frappe.ready(function() {
	// bind events here

	function generateTableHead(table, data) {
		let thead = table.createTHead();
		let row = thead.insertRow();
		for (let key of data) {
			let th = document.createElement("th");
			let text = document.createTextNode(key);
			th.appendChild(text);
			row.appendChild(th);
		}
	}

	function generateTable(table, data) {
		for (let i = 0; i < data.length; i++) {
			console.log(data[i])
			let row = table.insertRow();
			for (let j = 0; j < data[i].length; j++) {
				let cell = row.insertCell();
				console.log(data[i][j])
				let text = document.createTextNode(data[i][j]);
				cell.appendChild(text);
			}
		}
	}	  

	function getElementByXpath(path) {
		return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	}
	  
	frappe.web_form.after_load = () => {

		// console.log("Test1")
		// let mountains = [
		// 	{ name: "Monte Falco", height: 1658, place: "Parco Foreste Casentinesi" },
		// ];
		let table1 = document.createElement("table");
		let label1 = document.createElement("label");
		// let data = Object.keys(mountains[0]);
		// generateTableHead(table1, data);
		// find_ele = document.getElementById("page-gym-exercise-enrolment-form")
		let find_ele = getElementByXpath("/html/body/div[1]/div/main/div[2]/div/div/div[2]/div/div[2]/div/div/div/form/div[3]/div/div[2]/div[1]/div");
		// find_ele.append(table1)
		// console.log("Test2")
		// table1.style.border = "thick solid #0000FF"
		find_ele.append(label1)
		find_ele.append(table1)
		
		frappe.web_form.on('plan_enrolled', async () => {
			let field = frappe.web_form.get_value("plan_enrolled")
			console.log("Test")
			let reply_message = await frappe.call({
				method: "gym_management.gym_management.web_form.gym_exercise_enrolment_form.gym_exercise_enrolment_form.show_table",
				args: {
					"trg_plan": field,
				},
				callback: function(r) {
					// code snippet
					let r_msg = r.message
					let data = r_msg[2]
					let label_text = r_msg[1]
					let monthly_price = r_msg[0]
					console.log(monthly_price)
					label_text = "Course conducted by " + label_text + " at $" + monthly_price + " per month"
					label1.innerHTML = label_text
					rowCount=table1.rows.length
					for (var i = 0; i < rowCount; i++) {
						table1.deleteRow(0);
					}
					generateTableHead(table1, ["Exercise          ", "Description          ", "Start Time", "Duration (hr)", "Day"])
					generateTable(table1, data)
				}
			})
		});
	
	}
})



