import pyttsx3

def list_voices():
    try:
        engine = pyttsx3.init()
        voices = engine.getProperty('voices')
        
        print(f"Found {len(voices)} voices:")
        for voice in voices:
            print(f"ID: {voice.id}")
            print(f"Name: {voice.name}")
            print(f"Languages: {voice.languages}")
            print("-" * 20)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_voices()
