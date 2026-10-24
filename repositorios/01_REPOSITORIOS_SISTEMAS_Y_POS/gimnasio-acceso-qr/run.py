import os, sys, subprocess, threading, queue, psutil, atexit, select
import tkinter as tk
import ttkbootstrap as ttk
from tkinter import messagebox
from datetime import datetime
from ttkbootstrap.constants import *
from ttkbootstrap.widgets.scrolled import ScrolledText

class GymLauncher(ttk.Window):
    def __init__(self):
        super().__init__(themename="darkly")
        self.title("🚀 Gimnasio Manager EXPERIMENTAL")
        self.geometry("1150x800")
        self.minsize(950, 650)
        
        self.project_root = self.find_project_root()
        self.python_cmd = self.detect_python()
        self.manage_py = os.path.join(self.project_root, "manage.py")
        
        if not os.path.exists(self.manage_py):
            messagebox.showerror("Error Crítico", f"No se encontró manage.py en:\n{self.manage_py}")
            return
        
        self.log_queue = queue.Queue(maxsize=1000)  # Limitar memoria
        self.server_process = None
        self.active_tasks = []
        
        self.create_ui()
        self.process_log_queue()  # Iniciar polling optimizado
        atexit.register(self.force_cleanup)

    def find_project_root(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if os.path.exists(os.path.join(base_dir, "manage.py")): return base_dir
        possible_path = os.path.join(base_dir, "Gimnasio")
        if os.path.exists(os.path.join(possible_path, "manage.py")): return possible_path
        return base_dir 

    def detect_python(self):
        if sys.platform == "win32":
            return "py" if os.system("py --version >nul 2>&1") == 0 else "python"
        return "python3"

    def create_ui(self):
        main_container = ttk.Frame(self, padding=20)
        main_container.pack(fill=BOTH, expand=YES)
        
        # Header
        header = ttk.Frame(main_container)
        header.pack(fill=X, pady=(0, 20))
        lbl_title = ttk.Label(header, text="GIMNASIO MANAGEMENT SYSTEM", font=("Helvetica", 22, "bold"), bootstyle="light")
        lbl_title.pack(side=LEFT)
        self.lbl_status = ttk.Label(header, text="🔴 Servidor Offline", font=("Helvetica", 12, "bold"), bootstyle="danger")
        self.lbl_status.pack(side=RIGHT, padx=10)

        # Notebook
        self.notebook = ttk.Notebook(main_container, bootstyle="primary")
        self.notebook.pack(fill=BOTH, expand=YES)
        
        # Tabs
        self.tab_dashboard = ttk.Frame(self.notebook, padding=20)
        self.notebook.add(self.tab_dashboard, text=" 🎛️ Dashboard Principal ")
        self.build_dashboard_tab()
        
        self.tab_poblar = ttk.Frame(self.notebook, padding=20)
        self.notebook.add(self.tab_poblar, text=" 👥 Generador de Datos ")
        self.build_poblar_tab()
        
        self.tab_logs = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(self.tab_logs, text=" 📟 Terminal / Logs ")
        self.build_logs_tab()

    def build_dashboard_tab(self):
        self.tab_dashboard.columnconfigure(0, weight=1)
        self.tab_dashboard.columnconfigure(1, weight=1)
        
        # === COLUMNA IZQUIERDA: SERVIDOR ===
        frame_server = ttk.Labelframe(self.tab_dashboard, text=" Control del Servidor ", padding=20, bootstyle="info")
        frame_server.grid(row=0, column=0, sticky="nsew", padx=(0, 15), pady=10)
        
        # Texto explicativo Servidor
        ttk.Label(frame_server, text="Estado del Servicio", font=("Arial", 11, "bold"), bootstyle="info").pack(anchor="w")
        ttk.Label(frame_server, text="Enciende el servidor local para acceder a la página web.\nEl puerto por defecto es el 8000.", 
                  bootstyle="secondary", font=("Arial", 9)).pack(anchor="w", pady=(0, 10))
        
        self.btn_server = ttk.Button(frame_server, text="▶  INICIAR SERVIDOR", bootstyle="success", command=self.toggle_server)
        self.btn_server.pack(fill=X, pady=10, ipady=8)
        
        ttk.Separator(frame_server).pack(fill=X, pady=20)
        
        # Accesos Rápidos
        ttk.Label(frame_server, text="Accesos Rápidos", font=("Arial", 11, "bold"), bootstyle="info").pack(anchor="w")
        ttk.Label(frame_server, text="Funciona solo cuando el servidor está encendido (Verde).", 
                  bootstyle="secondary", font=("Arial", 8)).pack(anchor="w", pady=(0, 10))

        btn_web = ttk.Button(frame_server, text="🌐 Abrir Sitio Web (Cliente)", bootstyle="secondary", 
                             command=lambda: os.startfile("http://localhost:8000") if sys.platform == "win32" else None)
        btn_web.pack(fill=X, pady=5)
        
        btn_admin = ttk.Button(frame_server, text="🔑 Abrir Panel Administrativo", bootstyle="secondary", 
                               command=lambda: os.startfile("http://127.0.0.1:8000/admin") if sys.platform == "win32" else None)
        btn_admin.pack(fill=X, pady=5)

        # === COLUMNA DERECHA: MANTENIMIENTO ===
        frame_maint = ttk.Labelframe(self.tab_dashboard, text=" Gestión del Sistema ", padding=20, bootstyle="warning")
        frame_maint.grid(row=0, column=1, sticky="nsew", padx=(15, 0), pady=10)
        
        # Sección Migraciones
        ttk.Label(frame_maint, text="1. Actualización de Base de Datos", font=("Arial", 11, "bold"), bootstyle="warning").pack(anchor="w")
        ttk.Label(frame_maint, text="Detecta cambios en los archivos 'models.py' y actualiza\nla estructura de la base de datos.", 
                  bootstyle="secondary", font=("Arial", 9)).pack(anchor="w", pady=(0, 5))
        
        btn_mig = ttk.Button(frame_maint, text="📦 Hacer Migraciones y Aplicar", bootstyle="warning", 
                             command=self.full_migration)
        btn_mig.pack(fill=X, pady=10)
        
        ttk.Separator(frame_maint).pack(fill=X, pady=20)
        
        # Sección Init System
        ttk.Label(frame_maint, text="2. Instalación Inicial", font=("Arial", 11, "bold"), bootstyle="danger").pack(anchor="w")
        ttk.Label(frame_maint, text="¡CUIDADO! Ejecutar solo la primera vez.", bootstyle="danger", font=("Arial", 9, "bold")).pack(anchor="w")
        ttk.Label(frame_maint, text="Crea el Superusuario y roles (Admin/Moderador)\nnecesarios para entrar al sistema.", 
                  bootstyle="secondary", font=("Arial", 9)).pack(anchor="w", pady=(0, 5))
        
        btn_init = ttk.Button(frame_maint, text="🛠️  EJECUTAR INIT_SYSTEM", bootstyle="danger", 
                              command=lambda: self.run_thread("init_system"))
        btn_init.pack(fill=X, pady=10, ipady=5)

    def build_poblar_tab(self):
        lbl_title = ttk.Label(self.tab_poblar, text="Generador de Datos Masivos", font=("Arial", 14, "bold"))
        lbl_title.pack(pady=(0, 5))
        
        grid_frame = ttk.Frame(self.tab_poblar)
        grid_frame.pack(fill=BOTH, expand=YES)
        
        meses = [
            ("Enero", 15), ("Febrero", 10), ("Marzo", 20), ("Abril", 12),
            ("Mayo", 10), ("Junio", 8), ("Julio", 8), ("Agosto", 10),
            ("Septiembre", 15), ("Octubre", 12), ("Noviembre", 18), ("Diciembre", 12)
        ]
        self.spinboxes = {}
        for i, (mes, default) in enumerate(meses):
            r, c = i // 3, i % 3
            card = ttk.Labelframe(grid_frame, text=f"{mes}", padding=10)
            card.grid(row=r, column=c, padx=10, pady=10, sticky="nsew")
            grid_frame.columnconfigure(c, weight=1)
            
            spin = ttk.Spinbox(card, from_=0, to=500, bootstyle="light")
            spin.set(default)
            spin.pack(fill=X)
            self.spinboxes[mes.lower()] = spin

        btn_exec = ttk.Button(self.tab_poblar, text="👥  POBLAR BASE DE DATOS AHORA", bootstyle="primary", command=self.execute_poblar_db)
        btn_exec.pack(fill=X, pady=25, ipady=10)

    def build_logs_tab(self):
        self.log_area = ScrolledText(self.tab_logs, height=20, state="disabled", font=("Consolas", 9))
        self.log_area.pack(fill=BOTH, expand=YES)
        self.log_area.text.tag_config("INFO", foreground="#2ecc71")
        self.log_area.text.tag_config("ERROR", foreground="#e74c3c")
        self.log_area.text.tag_config("CMD", foreground="#f1c40f")

    # --- LÓGICA DE PROCESOS Y OPTIMIZACIÓN (BACKEND ROBUSTO) ---

    def log(self, msg, type="INFO"):
        """Envía mensaje a la cola (Thread Safe)"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_queue.put((f"[{timestamp}] {msg}\n", type))

    def process_log_queue(self):
        """✅ FIX: Variable type_ movida correctamente"""
        has_error = False
        processed = 0
        
        while not self.log_queue.empty() and processed < 10:
            try:
                msg, type_ = self.log_queue.get_nowait()
                if not hasattr(self, 'log_area'): return  # UI no lista
                self.log_area.text.configure(state="normal")
                self.log_area.text.insert(tk.END, msg, type_)
                num_lines = int(self.log_area.text.index('end-1c').split('.')[0])
                if num_lines > 1000:
                    self.log_area.text.delete('1.0', '100.0')
                self.log_area.text.see(tk.END)
                self.log_area.text.configure(state="disabled")
                if type_ == "ERROR":
                    has_error = True
                processed += 1
            except queue.Empty:
                break
        
        if has_error:
            self.notebook.select(self.tab_logs)
        
        self.after(300, self.process_log_queue)  # Bajo CPU

    def kill_process_tree(self, pid):
        try:
            parent = psutil.Process(pid)
            children = parent.children(recursive=True)
            for child in children:
                child.kill()
            parent.kill()
            return True
        except psutil.NoSuchProcess:
            return False
        except Exception as e:
            print(f"Error matando procesos: {e}")
            return False

    def run_thread(self, command, args=[]):
        threading.Thread(target=self.execute_command, args=(command, args), daemon=True).start()

    def execute_command(self, command, args=[]):
        # FIX: Agregamos "-u" para 'Unbuffered' output. Esto hace que los logs salgan al instante.
        full_cmd = [self.python_cmd, "-u", self.manage_py, command] + args
        self.log(f"Ejecutando: {' '.join(full_cmd)}", "CMD")
        
        try:
            kwargs = {}
            if sys.platform != "win32":
                kwargs['start_new_session'] = True
            else:
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW

            process = subprocess.Popen(
                full_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                cwd=self.project_root, 
                text=True,
                bufsize=1,
                **kwargs
            )
            
            if command != "runserver":
                self.active_tasks.append(process)

            # Ahora leerá línea por línea en tiempo real gracias a "-u"
            for line in process.stdout:
                self.log(line.strip(), "INFO")
            
            process.wait()
            
            if process in self.active_tasks:
                self.active_tasks.remove(process)

            if process.returncode != 0:
                self.log(f"Comando finalizó con error (Código {process.returncode})", "ERROR")
            else:
                self.log("Comando finalizado con éxito.", "INFO")
                
        except Exception as e:
            self.log(f"Error de ejecución: {e}", "ERROR")

    def toggle_server(self):
        if self.server_process is None:
            # INICIAR
            self.log("Iniciando servidor Django...", "CMD")
            # FIX: Agregamos "-u" aquí también
            cmd = [self.python_cmd, "-u", self.manage_py, "runserver"]
            
            try:
                self.server_process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    cwd=self.project_root,
                    text=True,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
                )
                
                threading.Thread(target=self.monitor_server, daemon=True).start()
                
                self.btn_server.configure(text="⏹ DETENER SERVIDOR", bootstyle="danger")
                self.lbl_status.configure(text="🟢 Online (Port 8000)", bootstyle="success")
                
            except Exception as e:
                self.log(f"Fallo al iniciar server: {e}", "ERROR")
        else:
            # DETENER
            self.log("Deteniendo servidor y subprocesos...", "CMD")
            
            if self.server_process:
                self.kill_process_tree(self.server_process.pid)
            
            self.server_process = None
            self.btn_server.configure(text="▶ INICIAR SERVIDOR", bootstyle="success")
            self.lbl_status.configure(text="🔴 Offline", bootstyle="danger")
            self.log("Servidor apagado correctamente.", "INFO")

    def monitor_server(self):
        proc = self.server_process
        while proc and proc.poll() is None:
            try:
                # Windows-compatible: use readline with timeout simulation
                line = proc.stdout.readline()
                if line:
                    self.log(line.strip(), "INFO")
                elif proc.poll() is not None:
                    break
            except:
                break  # Pipe closed or process ended

    def full_migration(self):
        def _sequence():
            self.execute_command("makemigrations")
            self.execute_command("migrate")
        threading.Thread(target=_sequence, daemon=True).start()

    def execute_poblar_db(self):
        args = []
        for mes, spin in self.spinboxes.items():
            if int(spin.get()) > 0: args.extend([f"--{mes}", spin.get()])
        
        if args:
            self.notebook.select(self.tab_logs)
            self.run_thread("poblar_db", args)
        else:
            messagebox.showinfo("Info", "Todos los meses están en 0.")

    def on_close(self):
        self.log("🔴 Cerrando todos los procesos...", "CMD")
        if self.server_process:
            self.kill_all_processes(self.server_process.pid)
        for proc in self.active_tasks[:]:  # Copia para iterar seguro
            if proc.poll() is None:
                self.kill_all_processes(proc.pid)
        self.destroy()
        os._exit(0)  # Fuerza salida inmediata

    def force_cleanup(self):
        if self.server_process:
            self.kill_all_processes(self.server_process.pid)
        for proc in self.active_tasks[:]:
            if proc.poll() is None:
                self.kill_all_processes(proc.pid)
        os._exit(0)

    def kill_all_processes(self, pid):
        """Mata proceso + árbol completo + CMD padre"""
        try:
            parent = psutil.Process(pid)
            children = parent.children(recursive=True)
            for child in children:
                child.kill()
            parent.kill()
            # Matar CMD padre en Windows
            if sys.platform == "win32":
                pp = psutil.Process(parent.ppid())
                if "cmd" in pp.name().lower() or "conhost" in pp.name().lower():
                    pp.kill()
        except:
            pass

if __name__ == "__main__":
    app = GymLauncher()
    app.protocol("WM_DELETE_WINDOW", app.on_close)
    app.mainloop()