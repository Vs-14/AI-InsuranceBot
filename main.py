from flask import Flask, render_template, request, jsonify
import time
import os
from langchain.text_splitter import TokenTextSplitter
from langchain.docstore.document import Document
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings.sentence_transformer import SentenceTransformerEmbeddings
from openai import OpenAI

app = Flask(__name__)

# Initializing OpenAI client with API key
client = OpenAI(api_key="YOUR_API_KEY")

# Global variable to store the knowledge base
docsearch = None

# Fxn to merge all the documents together into a text file as the knowledge base
def create_knowledgeBase():
    folder_path = 'DOCS'
    output_file = 'merged_docs.txt'

    with open(output_file, 'w', encoding='utf-8') as outfile:
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            with open(file_path, 'r', encoding='utf-8') as infile:
                outfile.write(infile.read())

    # Loading and spliting the text file
    with open('merged_docs.txt', 'r') as file:
        file_contents = file.read()

    text_splitter = TokenTextSplitter(
        chunk_size=500,
        chunk_overlap=25
    )
    chunks = text_splitter.split_text(file_contents)
    
    # Storing data as documents for storing as vectors in chroma DB
    documents = [
        Document(page_content=chunk, metadata={"source": "local"}) for chunk in chunks
    ]
    embedding_function = SentenceTransformerEmbeddings(model_name="all-mpnet-base-v2")
    docsearch = Chroma.from_documents(documents, embedding_function)

    return docsearch

# Fxn to get AI response
def get_ai_response(prompt, docsearch):
    prompt_lower = prompt.lower()

    # Fetching relevant documents using vector similarity search between the user qs and knowledge base
    relevant_docs = docsearch.similarity_search(prompt_lower, k=3)
    relevant_contexts = '\n'.join([doc.page_content for doc in relevant_docs])

    # Messages list to pass to the model
    messages = [
    {
        "role": "system",
        "content": f"""You are InsuranceBot, an AI assistant specializing in insurance information.

        When responding:
        1. Be concise, accurate, and focus only on information found in the provided context
        2. Use a friendly, helpful, and professional tone
        3. Format important information with bullet points or numbered lists for readability
        4. If you're unsure about specific details, acknowledge this rather than making up information
        5. Don't reference that you're using "context" or "documents" - simply provide the information naturally
        
        Conversation guidelines:
        - If the user is greeting you → Respond with: "Hello! I'm InsuranceBot, your insurance assistant. How can I help you today with your insurance questions?"
        - If the question is partially related to insurance but specifics aren't in context → Provide general information that you do know, then offer: "I can provide more details about our health, life, auto, or home insurance policies. Which would you like to know more about?"
        - If the question is completely unrelated to insurance → Respond with: "I specialize in insurance information. Would you like to know about our health, life, auto, or home insurance policies? Or perhaps about premiums, coverage options, or the claims process?"
        - For complex inquiries that would require human assistance → Provide any helpful information you can, then: "For this specific situation, I'd recommend speaking with one of our insurance agents who can provide personalized guidance. Would you like information on how to contact a representative?"
        
        Use the following information to answer the user's question:
        
        {relevant_contexts}
        """
    }]

    # Add user question
    messages.append({
        "role": "user",
        "content": prompt_lower
    })

    # Generating response using chatgpt as the LLM
    completion = client.chat.completions.create(
        model="gpt-4.1-nano",
        messages=messages,
        temperature=0.2
    )

    return completion.choices[0].message.content

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/send_message', methods=['POST'])
def send_message():
    data = request.json
    user_message = data.get('message', '')
    
    # Get response from AI
    ai_response = get_ai_response(user_message, docsearch)
    
    return jsonify({'response': ai_response})

@app.route('/api/faq', methods=['POST'])
def get_faq_response():
    data = request.json
    faq_type = data.get('type', '')
    
    if faq_type == 'health':
        return jsonify({'response': """## Health Insurance
Our health insurance plans cover a range of medical expenses including hospitalization, surgery, prescription drugs, and preventive care. 

**Key features:**
- Coverage for hospitalization and surgery
- Prescription drug coverage
- Preventive care benefits
- Option for dental and vision add-ons
- Access to our network of healthcare providers

Would you like more specific information about coverage limits or plan types?"""})
    
    elif faq_type == 'claim':
        return jsonify({'response': """## Filing Insurance Claims
Our claims process is designed to be straightforward and efficient:

1. **Report the claim** through our mobile app, website, or by calling our 24/7 claims hotline
2. **Provide necessary documentation** such as photos, police reports, or medical records
3. **Meet with a claims adjuster** if necessary (typically for auto and home claims)
4. **Receive claim decision** and payment for approved claims

Most claims are processed within 5-7 business days, with emergency claims receiving priority handling.

Need to file a claim now? I can transfer you to our claims department."""})
    
    elif faq_type == 'premium':
        return jsonify({'response': """## Insurance Premiums
Premiums vary based on several factors:

**For health insurance:**
- Age, location, and plan type
- Individual vs. family coverage
- Deductible and co-pay amounts

**For life insurance:**
- Age, gender, and health condition
- Coverage amount and policy type
- Term length (for term policies)

**For auto insurance:**
- Driving history and vehicle type
- Location and annual mileage
- Selected coverage and deductibles

**For home insurance:**
- Home value and location
- Construction type and age of home
- Coverage limits and deductibles

We offer various discounts and payment plans to make premiums more affordable."""})
    
    elif faq_type == 'human':
        return jsonify({'response': "I'll connect you with a human agent. Please hold while I transfer your chat..."})
    
    return jsonify({'response': "Sorry, I couldn't process that request."})

if __name__ == "__main__":
    # Initialize knowledge base
    docsearch = create_knowledgeBase()
    app.run(debug=True)