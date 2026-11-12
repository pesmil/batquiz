// =====================================================================
//  EINSTELLUNGEN – nur diese Datei und die Dateien im Ordner quizzes/ musst du bearbeiten
// =====================================================================
window.QUIZ_CONFIG = {
  // URL der Google-Apps-Script-Web-App (siehe ANLEITUNG.md, Schritt 2).
  // Leer lassen = Testmodus: Antworten werden nur in der Browser-Konsole angezeigt.
  scriptUrl: "https://script.google.com/macros/s/AKfycbw2MI73BAVcJ3awhoneJyAHQ22zTkSr4pIZIp6PfTvF7uz1XQTi9mqzNN0huyQK4eGPTg/exec",

  // Wird bei jeder Antwort mitgespeichert, damit du Testläufe von der
  // echten Erhebung trennen kannst. Vor dem Versand z.B. auf "v1" setzen.
  version: "v1",

  // Texte der Startseite (Englisch)
  title: "Which bats can be identified from photos?",
  intro:
    "This is a small, informal survey among bat workers. You will see a series of field photos. " +
    "For each one, tell me what you think it is and which features you based that on. " +
    "The goal is to get a feel for which species can be identified reliably from photos, and which cannot.",
  instructions: [
    "Identify to the level you are comfortable with: species, species complex or genus are all valid answers.",
    "Describe the features you used. Short notes are fine.",
    "The reference identifications are shown at the end.",
  ],
  consent:
    "Participation is anonymous. No names, e-mail or IP addresses are stored, only your answers and the time spent per photo. ",

  // Optionale Taxon-Vorschläge von iNaturalist beim Tippen (true/false)
  inatSuggestions: true,

  // Results-Seite (results.html): true = Auswertung anzeigen,
  // false = nur "The survey is still running" (damit niemand die Lösungen vorher sieht).
  showResults: true,

  // Die Quizze, in dieser Reihenfolge auf der Startseite.
  // id   = Dateiname im Ordner quizzes/ ohne ".js" (z.B. quizzes/plecotus.js)
  // name = Anzeigename (wird kursiv gesetzt)
  // Neues Quiz: Datei in quizzes/ anlegen (z.B. pipistrellus.js kopieren) und hier eine Zeile ergänzen.
  quizzes: [
    { id: "pipistrellus", name: "Pipistrellus" },
    { id: "plecotus", name: "Plecotus" },
    { id: "myotis-mystacinus", name: "Myotis mystacinus complex" },
  ],
};
