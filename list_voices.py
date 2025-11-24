import asyncio
import edge_tts

async def main():
    voices = await edge_tts.list_voices()
    italian_voices = [v['ShortName'] for v in voices if 'it-IT' in v['ShortName']]
    print(italian_voices)

if __name__ == "__main__":
    asyncio.run(main())
