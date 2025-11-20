import os
import ollama

class LLMService:
    """def __init__(self, model_name="llama3.1", data_path="data/school_info.txt"):"""
    def __init__(self, model_name="llama3.1:latest", data_path="data/school_info.txt"):
        self.model_name = model_name
        self.context = self._load_context(data_path)
        self.system_prompt = self._create_system_prompt()

    def _load_context(self, path):
        try:
            with open(path, "r") as f:
                return f.read()
        except Exception as e:
            print(f"Error loading context: {e}")
            return ""

    def _create_system_prompt(self):
        return f"""
Sei un assistente virtuale utile e amichevole per l'Istituto Tecnico Tecnologico "G. Malafarina" di Soverato.
Il tuo compito è aiutare gli studenti delle scuole medie e le loro famiglie a orientarsi tra i corsi di studio e le attività della scuola.
Usa SOLO le seguenti informazioni per rispondere alle domande. Se non conosci la risposta basandoti su queste informazioni, dillo chiaramente e invita a contattare la scuola.
Non inventare informazioni.

INFORMAZIONI SCUOLA:
{self.context}

Rispondi in italiano, in modo accogliente e incoraggiante. Sii conciso ma completo.
"""

    def chat(self, user_message, history=[]):
        # Prepare messages including history if needed, but for simplicity we might just append user message to system prompt for now
        # or use the chat history format supported by Ollama.
        
        messages = [{'role': 'system', 'content': self.system_prompt}]
        
        # Add history (optional, for now let's just take the current message to keep it simple and robust)
        # If history is passed, it should be a list of {'role': 'user'/'assistant', 'content': '...'}
        messages.extend(history)
        
        messages.append({'role': 'user', 'content': user_message})

        try:
            response = ollama.chat(model=self.model_name, messages=messages)
            return response['message']['content']
        except Exception as e:
            return f"Mi dispiace, si è verificato un errore tecnico: {str(e)}. Assicurati che Ollama sia in esecuzione."
