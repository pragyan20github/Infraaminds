from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import os

class ArchitextModel:
    def __init__(self, model_path=None):
        # Use absolute path for reliability
        if model_path is None:
            model_path = os.path.abspath("./models/architext-gptj-162M") #model name
        print(f"Loading Architext model from: {model_path}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
        self.model = AutoModelForCausalLM.from_pretrained(model_path, local_files_only=True)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)

    def generate(self, prompt, max_new_tokens=128):
        try:
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_length=inputs["input_ids"].shape[1] + max_new_tokens,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.95,
                    pad_token_id=self.tokenizer.eos_token_id
                )
            full_response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            print("FULL MODEL OUTPUT:", repr(full_response))  # Debug print
            # Also print the prompt length and output length for clarity
            print(f"Prompt length: {len(prompt)}, Full response length: {len(full_response)}")
            return full_response[len(prompt):].strip()
        except Exception as e:
            print("Error during model generation:", e)
            return "MODEL ERROR: " + str(e)
