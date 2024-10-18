"""
Algorithm logic:

1. Login to Master
2. Create company
3. Get Company ID
4. Create users
5. Create application
6. Get Application ID
7. Edit application access
"""

import requests

def login_master(login=None, password=None, token_2fa=None) -> str:
    
    if (login == None) or (password == None) or (token_2fa == None):
        login = input("What is your own login address to Master CRM? ")
        password = input("What is the password to your own Master CRM? ")
        token_2fa = None
    
    payload = {
        "login": login,
        "password": password,
        "token_2fa": token_2fa
    }

    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer None",
        "Content-Type": "application/json"
    }

    url = "https://id.irev.com/master/backend/crm/api/v1/auth/login"

    response = requests.post(url=url, headers=headers, json=payload).json()
    access_token = response["data"]["access_token"]
    return access_token

class Company:
    def __init__(self, access_token=None):
        print("QUESTIONS ABOUT THE COMPANY")
        if access_token == None:
            self.access_token = login_master()
        else:
            self.access_token = access_token
        self.company_name = input("What is the company name? ")
        self.telegram = input("What is the company's telegram? ")
        self.skype = input("What is the company's skype? ")
        self.country = input("What is the company's country? Ex. 'BR'")
        self.payment_type = input("What will be the payment type? Card or Manual? ").lower()
        self.tier = "basic"
        self.stage = None
        self.sales_manager_id = None
        self.ob_manager_id = None

    def get_company_id(self) -> str:
        url = f"https://id.irev.com/master/backend/crm/api/v1/companies?limit=1&page=1&filters%5Bname%5D%5B0%5D={self.company_name}&order_values=None"
        headers = {
        "Authorization": f"Bearer {self.access_token}",
        "Content-Type": "application/json"
        }
        response = requests.get(url=url, headers=headers).json()
        company_id = response["data"]["rows"][0]["id"]
        return str(company_id)

    def create_company(self):
        url = "https://id.irev.com/master/backend/crm/api/v1/action/process"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        payload = {"action":"Company\\Create",
                "repository":"Eloquent\\CompanyRepository",
                "arguments":{
                    "name":self.company_name,
                    "telegram": self.telegram,
                    "skype": self.skype,
                    "country": self.country,
                    "payment_type": self.payment_type,
                    "tier": self.tier,
                    "stage": self.stage,
                    "whitelisting_enabled":"0",
                    "group_templates":["1","2","7"],
                    "sales_manager_id": self.sales_manager_id,
                    "onboarding_manager_id": self.ob_manager_id,
                    "whitelisted_ips":None,
                    "active":"1"}}
        requests.post(url=url, headers=headers, json=payload).json()
        
        company_id = self.get_company_id()
        return company_id

class User:
    def __init__(self, access_token=None):
        if access_token == None:
            self.access_token = login_master()
        else:
            self.access_token = access_token
        print("QUESTIONS ABOUT THE USER")
        self.first_name = input("What is the user's first name? ")
        self.last_name = input("What is the user's last name? ")
        self.login = input("What is the user's email address? ")
        self.password = input("What will be the user's password? ")
        self.phone = input("What is the user's phone? Add + Country Code")
        
    def create_user(self, company_id):
        url = "https://id.irev.com/master/backend/crm/api/v1/action/process"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        payload = {"action":"User\\Create",
                "repository":"Eloquent\\UserRepository",
                "arguments":{
                    "first_name":self.first_name,
                    "last_name":self.last_name,
                    "login":self.login,
                    "password":self.password,
                    "email":self.login,
                    "phone":self.phone,
                    "otp":"disabled",
                    "telegram":None,
                    "timezone":"America/New_York",
                    "company_id":company_id,
                    "role":"2",
                    "groups":["647"],
                    "active":"1",
                    "default_filter_type":"none",
                    "default_filter_value":None,
                    "default_filter_tracking_provider":None,
                    "change_password":"0",
                    "ip_whitelisting_enabled":"0",
                    "allowed_terms":None,
                    "disallowed_terms":None,
                    "note":None}}
        
        requests.post(url=url, headers=headers, json=payload).json()

        url = f"https://id.irev.com/master/backend/crm/api/v1/users?limit=25&page=1&filters%5Blogin%5D%5B0%5D={self.login}&order_values=null"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(url=url, headers=headers).json()
        user_id = response["data"]["rows"][0]["id"]
        if user_id:
            return str(user_id)
        else:
            return False

class Application():
    def __init__(self, access_token=None):
        if access_token == None:
            self.access_token = login_master()
        else:
            self.access_token = access_token
        self.name = input("What will the application name be? ")
        self.workspace = input("What will the workspace going to be (before .irev.com)? ")

    def create_application(self, company_id) -> dict:
        url = "https://id.irev.com/master/backend/crm/api/v1/action/process"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        payload = {"action":"Application\\Create",
                "repository":"Eloquent\\ApplicationRepository",
                "arguments":{
                    "name": self.name,
                    "workspace": self.workspace,
                    "company_id": company_id,
                    "type": "tracking-software",
                    "development":"0",
                    "initial_template_id": "4",
                    "ftd_cost":None,
                    "active":"1",
                    "deactivation_reason":None,
                    "logo":"https://irev.ams3.digitaloceanspaces.com/master/33829d66.png"}}
        
        requests.post(url=url, headers=headers, json=payload)

        url = f"https://id.irev.com/master/backend/crm/api/v1/applications?trashed=false&limit=1&page=1&filters%5Bname%5D%5B0%5D={self.name}&order_values=None"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        response = requests.get(url=url, headers=headers).json()
        self.application_id = response["data"]["rows"][0]["id"]
        return str(self.application_id)

    def add_user_to_application(self, user_id):
        if self.application_id == None:
            print("No application was created yet")
            return False
        url = "https://id.irev.com/master/backend/crm/api/v1/action/process"
        headers = {
        "Authorization": f"Bearer {self.access_token}",
        "Content-Type": "application/json"
        }
        payload = {"action":"ApplicationAccess\\Create",
                "arguments":{
                    "assignee_type":"User",
                    "assignee_id":user_id,
                    "application_id":self.application_id
                    },
                    "repository":"Eloquent\\ApplicationAccessRepository"}
        response = requests.post(url=url,headers=headers,json=payload).json()
        if "measure" in response:
            return "ok"
        else:
            return "not ok"

def main():
    company = Company()
    company_id = company.create_company()
    pass

    application = Application()
    application.create_application(company_id)

    quantity_users = int(input("How many users do you want to create? "))
    user_ids = []
    
    for _ in range(quantity_users):
        user = User()
        user.create_user(company_id)
        user_id = user.get_user_id()
        user_ids.append(user_id)
        status = application.add_user_to_application(user_id)
        if status == "ok":
            print(f"User {user_id} created!")
        else:
            print(f"User {user_id} was NOT created")

if __name__ == "__main__":
    main()
