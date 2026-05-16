(function () {
  if (window.secureTextCompare) return;

  function pickFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      if (accept) input.accept = accept;
      input.style.display = "none";
      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        input.remove();
        resolve(file || null);
      });
      input.addEventListener("cancel", () => {
        input.remove();
        resolve(null);
      });
      document.body.appendChild(input);
      input.click();
    });
  }

  function readText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Read failed"));
      reader.readAsText(file);
    });
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, "-");
  }

  function sanitize(name) {
    return String(name || "untitled").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "untitled";
  }

  window.secureTextCompare = {
    async openTextFile() {
      const file = await pickFile(".txt,.md,.markdown,.json,.csv,.tsv,.log,.xml,.yml,.yaml,.html,.htm,.js,.ts,.css,.py,.go,.rs,.c,.cpp,.h,.java,.kt,.swift,.rb,.php,.sql,.sh,text/*");
      if (!file) return null;
      if (/\.pdf$/i.test(file.name)) {
        throw new Error("PDF loading is desktop-only. Download the app for PDF support.");
      }
      const text = await readText(file);
      return {
        name: file.name,
        path: file.name,
        text,
        type: "text"
      };
    },

    async saveSession(session) {
      const name = `secure-text-compare-session_${timestamp()}.json`;
      downloadBlob(name, new Blob([JSON.stringify(session, null, 2)], { type: "application/json" }));
      return name;
    },

    async openSession() {
      const file = await pickFile("application/json,.json");
      if (!file) return null;
      const text = await readText(file);
      let session;
      try {
        session = JSON.parse(text);
      } catch (error) {
        throw new Error("Session file is not valid JSON.");
      }
      return { path: file.name, session };
    },

    async saveHtmlReport(html, metadata) {
      const left = sanitize((metadata && metadata.leftName) || "left");
      const right = sanitize((metadata && metadata.rightName) || "right");
      const name = `secure-text-compare_${left}_vs_${right}_${timestamp()}.html`;
      downloadBlob(name, new Blob([html], { type: "text/html" }));
      return {
        filePath: name,
        fileName: name,
        leftName: (metadata && metadata.leftName) || "",
        rightName: (metadata && metadata.rightName) || "",
        savedAt: new Date().toISOString()
      };
    },

    async openPath() {
      return false;
    },

    async checkForUpdates() {
      return null;
    },

    async installUpdate() {
      return null;
    },

    onUpdateStatus() {
      return () => {};
    }
  };
})();
