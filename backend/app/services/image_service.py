import asyncio
import logging
from google import genai
from app.config import GOOGLE_API_KEY
from app.services.storage_service import upload_file, resolve_image_path

logger = logging.getLogger("filmai.image")


def get_client():
    return genai.Client(api_key=GOOGLE_API_KEY)


async def generate_character_image(character: dict, project_id: str) -> str:
    client = get_client()

    prompt = (
        f"Professional film production character reference portrait. "
        f"Character: {character['name']}, age {character['age']}, {character['role']}. "
        f"Appearance: {character['appearance']}. "
        f"Personality conveyed through expression: {character['personality']}. "
        f"Cinematic lighting, photorealistic, high detail, neutral background, "
        f"front-facing portrait suitable for film production reference."
    )

    logger.info("Generating character image: %s (prompt: %d chars)", character["name"], len(prompt))
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-2.5-flash-image",
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            image_bytes = part.inline_data.data
            dest = f"projects/{project_id}/assets/characters/{character['id']}.png"
            url = upload_file(image_bytes, dest, "image/png")
            logger.info("Character image saved: %s -> %s (%d bytes)", character["name"], dest, len(image_bytes))
            return url

    logger.warning("No image data returned for character: %s", character["name"])
    return ""


async def generate_prop_image(prop: dict, project_id: str) -> str:
    client = get_client()

    prompt = (
        f"Professional film production prop reference image. "
        f"Prop: {prop['name']}. Category: {prop['category']}. "
        f"Description: {prop['description']}. "
        f"Clean white/neutral background, studio lighting, high detail, "
        f"product photography style, suitable for film production reference."
    )

    logger.info("Generating prop image: %s (prompt: %d chars)", prop["name"], len(prompt))
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-2.5-flash-image",
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            image_bytes = part.inline_data.data
            dest = f"projects/{project_id}/assets/props/{prop['id']}.png"
            url = upload_file(image_bytes, dest, "image/png")
            logger.info("Prop image saved: %s -> %s (%d bytes)", prop["name"], dest, len(image_bytes))
            return url

    logger.warning("No image data returned for prop: %s", prop["name"])
    return ""


async def generate_costume_image(costume: dict, character: dict | None, project_id: str) -> str:
    client = get_client()

    char_context = ""
    contents: list = []

    if character:
        char_context = f"Worn by {character['name']} ({character['appearance']}). "
        image_path = resolve_image_path(character.get("imageUrl"))
        if image_path:
            with open(image_path, "rb") as f:
                image_bytes = f.read()
            ext = image_path.rsplit(".", 1)[-1].lower()
            mime = f"image/{'jpeg' if ext in ('jpg', 'jpeg') else ext}"
            contents.append(genai.types.Part.from_bytes(data=image_bytes, mime_type=mime))
            logger.info("Including character reference image for costume: %s (%d bytes)", character["name"], len(image_bytes))

    prompt_text = (
        f"Professional film production costume design reference. "
        f"Costume: {costume['name']}. {char_context}"
        f"Description: {costume['description']}. "
        f"Materials: {', '.join(costume.get('materials', []))}. "
        f"Full body view showing the complete outfit on the character from the reference image, "
        f"fashion photography style, neutral background, high detail."
    )
    contents.append(prompt_text)

    logger.info("Generating costume image: %s (prompt: %d chars, has_ref: %s)", costume["name"], len(prompt_text), len(contents) > 1)
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-2.5-flash-image",
        contents=contents,
        config=genai.types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            image_bytes = part.inline_data.data
            dest = f"projects/{project_id}/assets/costumes/{costume['id']}.png"
            url = upload_file(image_bytes, dest, "image/png")
            logger.info("Costume image saved: %s -> %s (%d bytes)", costume["name"], dest, len(image_bytes))
            return url

    logger.warning("No image data returned for costume: %s", costume["name"])
    return ""
