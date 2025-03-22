from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer

def test_summarizer():
    # Test text
    text = """
    Python is a high-level, interpreted programming language known for its simplicity and readability.
    It was created by Guido van Rossum and was first released in 1991.
    Python's design philosophy emphasizes code readability with its notable use of significant whitespace.
    It is dynamically typed and garbage-collected.
    Python supports multiple programming paradigms, including procedural, object-oriented, and functional programming.
    Python is often used for web development, data analysis, artificial intelligence, and scientific computing.
    The language has a comprehensive standard library and a large ecosystem of third-party packages.
    Python's popularity has grown significantly in recent years, making it one of the most widely used programming languages.
    """
    
    # Create parser and summarizer
    parser = PlaintextParser.from_string(text, Tokenizer('english'))
    summarizer = LsaSummarizer()
    
    # Generate summary
    summary = summarizer(parser.document, 3)
    
    # Print results
    print("Original text length:", len(text.split()))
    print("\nSummary:")
    for sentence in summary:
        print(sentence)

if __name__ == "__main__":
    test_summarizer() 