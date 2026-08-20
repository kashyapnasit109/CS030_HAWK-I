import re

# Dictionary mapping Hindi and Gujarati color, clothes, and object terms to English
TRANSLATION_MAP = {
    # Hindi Colors
    "लाल": "red",
    "नीला": "blue",
    "हरा": "green",
    "पीला": "yellow",
    "पीली": "yellow",
    "काला": "black",
    "काली": "black",
    "सफेद": "white",
    "सफ़ेद": "white",
    "धूसर": "gray",
    "स्लेटी": "gray",
    "नारंगी": "orange",
    "बैंगनी": "purple",
    "गुलाबी": "pink",
    "भूरा": "brown",
    
    # Gujarati Colors
    "લાલ": "red",
    "ભૂરો": "blue",
    "ભૂરી": "blue",
    "વાદળી": "blue",
    "લીલો": "green",
    "લીલી": "green",
    "પીળો": "yellow",
    "પીળી": "yellow",
    "પીળું": "yellow",
    "કાળો": "black",
    "કાળી": "black",
    "કાળું": "black",
    "સફેદ": "white",
    "રાખોડી": "gray",
    "જાંબલી": "purple",
    "ગુલાબી": "pink",
    "કથ્થઈ": "brown",
    
    # Clothes & Accessories (Hindi & Gujarati)
    "शर्ट": "shirt",
    "શર્ટ": "shirt",
    "कमीज": "shirt",
    "पैंट": "pants",
    "પૅન્ટ": "pants",
    "पतलून": "pants",
    "टोपी": "cap",
    "ટોપી": "cap",
    "हेलमेट": "helmet",
    "હેલ્મેટ": "helmet",
    "चश्मा": "glasses",
    "ચશ્મા": "glasses",
    "जैकेट": "jacket",
    "જેકેટ": "jacket",
    
    # Objects & Subjects
    "फोन": "phone",
    "ફોન": "phone",
    "मोबाइल": "phone",
    "મોબાઈલ": "phone",
    "सेलफोन": "phone",
    "स्मार्टफोन": "phone",
    "સ્માર્ટફોન": "phone",
    "टेलीफोन": "phone",
    "ટેલિફોન": "phone",
    "कार": "car",
    "કાર": "car",
    "गाड़ी": "car",
    "ગાડી": "car",
    "वैन": "van",
    "વેન": "van",
    "स्कूटर": "scooter",
    "સ્કૂટર": "scooter",
    "मोटरसाइकिल": "motorcycle",
    "મોટરસાઇકલ": "motorcycle",
    "बाइका": "bike",
    "બાઇક": "bike",
    "साइकिल": "bicycle",
    "સાઇકલ": "bicycle",
    "बैग": "bag",
    "બેગ": "bag",
    "थैला": "bag",
    "થેલો": "bag",
    "सूटकेस": "suitcase",
    "સુટકેસ": "suitcase",
    "आदमी": "man",
    "માણસ": "man",
    "पुरुष": "man",
    "પુરુષ": "man",
    "महिला": "woman",
    "મહિલા": "woman",
    "औरत": "woman",
    "સ્ત્રી": "woman",
    "बच्चा": "child",
    "બાળક": "child",
    "कुत्ता": "dog",
    "કુતરો": "dog",
    "बिल्ली": "cat",
    "બિલાડી": "cat",
    "चाकू": "knife",
    "છરી": "knife",
    "हथियार": "weapon",
    "હથિયાર": "weapon"
}

def translate_query_to_english(query: str) -> tuple[str, bool]:
    """
    Translates a query containing Hindi or Gujarati words into standard English.
    Returns: (translated_query, is_translated)
    """
    if not query:
        return "", False
        
    words = re.findall(r'\w+', query.strip())
    translated_words = []
    is_translated = False
    
    for word in words:
        low_word = word.lower()
        if low_word in TRANSLATION_MAP:
            translated_words.append(TRANSLATION_MAP[low_word])
            is_translated = True
        else:
            translated_words.append(word)
            
    return " ".join(translated_words), is_translated
