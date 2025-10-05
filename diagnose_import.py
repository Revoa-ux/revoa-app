#!/usr/bin/env python3
"""
Diagnostic Script - Check Import Status
This script checks if products were imported and if the admin account is properly configured.
"""

import requests
import json

# Configuration
SUPABASE_URL = "https://0ec90b57d6e95fcbda19832f.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw"

# Admin credentials
ADMIN_EMAIL = "tyler@revoa.app"
ADMIN_PASSWORD = "RevoaAI17"


def login_and_get_token(email, password):
    """Login to Supabase and return JWT access token"""
    print(f"🔐 Attempting login as {email}...")

    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        data = response.json()

        if response.status_code == 200 and "access_token" in data:
            print(f"✅ Login successful!")
            print(f"   User ID: {data.get('user', {}).get('id', 'Unknown')}")
            return data["access_token"], data.get('user', {}).get('id')
        else:
            print(f"❌ Login failed!")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {json.dumps(data, indent=2)}")
            return None, None

    except Exception as e:
        print(f"❌ Login error: {e}")
        return None, None


def check_admin_permissions(token, user_id):
    """Check if user has admin permissions"""
    print(f"\n📋 Checking admin permissions...")

    headers = {
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.{user_id}&select=*",
            headers=headers
        )

        if response.status_code == 200:
            profiles = response.json()
            if profiles:
                profile = profiles[0]
                print(f"✅ User profile found!")
                print(f"   is_admin: {profile.get('is_admin', False)}")
                print(f"   admin_role: {profile.get('admin_role', 'None')}")
                return profile.get('is_admin', False)
            else:
                print(f"❌ No user profile found in user_profiles table!")
                print(f"   User ID: {user_id}")
                return False
        else:
            print(f"❌ Failed to check profile!")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error checking permissions: {e}")
        return False


def check_products(token):
    """Check if products were imported"""
    print(f"\n📦 Checking for imported products...")

    headers = {
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        # Check all products
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/products?select=id,name,approval_status,source,created_at&order=created_at.desc&limit=10",
            headers=headers
        )

        if response.status_code == 200:
            products = response.json()
            print(f"✅ Found {len(products)} products (showing last 10):")

            if products:
                for p in products:
                    print(f"   - {p.get('name', 'Unknown')}")
                    print(f"     Status: {p.get('approval_status', 'Unknown')}")
                    print(f"     Source: {p.get('source', 'Unknown')}")
                    print(f"     Created: {p.get('created_at', 'Unknown')}")
                    print()
            else:
                print(f"   No products found in database.")

            return len(products)
        else:
            print(f"❌ Failed to query products!")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return 0

    except Exception as e:
        print(f"❌ Error checking products: {e}")
        return 0


def check_import_logs(token):
    """Check import logs"""
    print(f"\n📊 Checking import logs...")

    headers = {
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/product_import_logs?select=*&order=created_at.desc&limit=5",
            headers=headers
        )

        if response.status_code == 200:
            logs = response.json()
            print(f"✅ Found {len(logs)} import log(s):")

            if logs:
                for log in logs:
                    print(f"   - Import at: {log.get('created_at', 'Unknown')}")
                    print(f"     Source: {log.get('source', 'Unknown')}")
                    print(f"     Total: {log.get('total_products', 0)}")
                    print(f"     Successful: {log.get('successful_imports', 0)}")
                    print(f"     Failed: {log.get('failed_imports', 0)}")
                    if log.get('error_details'):
                        print(f"     Errors: {json.dumps(log['error_details'], indent=6)}")
                    print()
            else:
                print(f"   No import logs found.")

            return len(logs)
        else:
            print(f"⚠️  Failed to query import logs (might not have permissions)")
            print(f"   Status: {response.status_code}")
            return 0

    except Exception as e:
        print(f"❌ Error checking import logs: {e}")
        return 0


def main():
    """Main diagnostic function"""
    print("=" * 70)
    print("🔍 IMPORT DIAGNOSTIC TOOL")
    print("=" * 70)

    # Step 1: Login
    token, user_id = login_and_get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        print("\n❌ DIAGNOSIS: Cannot login. The account might not exist.")
        print("\n📝 SOLUTION:")
        print("   1. Go to Supabase Dashboard → Authentication → Users")
        print("   2. Create user: tyler@revoa.app / RevoaAI17")
        print("   3. Auto-confirm email")
        print("   4. Add row to user_profiles with is_admin: true")
        return

    # Step 2: Check admin permissions
    is_admin = check_admin_permissions(token, user_id)
    if not is_admin:
        print("\n❌ DIAGNOSIS: User exists but is NOT an admin!")
        print("\n📝 SOLUTION:")
        print("   1. Go to Supabase Dashboard → Table Editor → user_profiles")
        print("   2. Find row with user_id:", user_id)
        print("   3. Set is_admin: true")
        print("   4. Set admin_role: super_admin")
        print("   5. Click Save")

    # Step 3: Check products
    product_count = check_products(token)

    # Step 4: Check import logs
    log_count = check_import_logs(token)

    # Final diagnosis
    print("\n" + "=" * 70)
    print("📋 DIAGNOSIS SUMMARY")
    print("=" * 70)

    if token and is_admin and product_count > 0:
        print("✅ Everything looks good!")
        print(f"   - Login: Working")
        print(f"   - Admin permissions: Yes")
        print(f"   - Products found: {product_count}")
        print("\n💡 If you don't see products in the UI, try:")
        print("   1. Hard refresh the page (Ctrl+Shift+R)")
        print("   2. Check browser console for errors")
        print("   3. Make sure you're viewing /admin/products (not /products)")
    elif token and is_admin and product_count == 0:
        print("⚠️  Admin setup is correct, but NO products found!")
        print("\n💡 This means:")
        print("   - The import script didn't actually run, OR")
        print("   - The import failed silently, OR")
        print("   - Products were created then deleted")
        print("\n📝 Try running the import script again:")
        print("   python ai_agent_import.py")
    elif token and not is_admin:
        print("❌ User exists but needs admin permissions!")
        print("   See solution above.")
    else:
        print("❌ Account doesn't exist or login failed!")
        print("   See solution above.")

    print("\n" + "=" * 70)


if __name__ == "__main__":
    main()
