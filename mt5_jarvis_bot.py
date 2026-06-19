import MetaTrader5 as mt5
import time
import json

def connect_mt5():
    print("Inisialisasi MetaTrader 5...")
    if not mt5.initialize():
        print("Gagal menginisialisasi MT5. Error code:", mt5.last_error())
        quit()
        
    print("Berhasil tersambung ke MetaTrader 5!")
    print(mt5.terminal_info())
    print(mt5.version())

def get_account_data():
    account_info = mt5.account_info()
    if account_info is None:
        print("Gagal mengambil data akun. Pastikan MT5 sedang login.")
        return None
        
    # Ekstraksi data saldo asli
    data = {
        "login": account_info.login,
        "server": account_info.server,
        "balance": account_info.balance,
        "equity": account_info.equity,
        "margin": account_info.margin,
        "free_margin": account_info.margin_free,
        "currency": account_info.currency,
        "profit": account_info.profit,
    }
    return data

if __name__ == "__main__":
    connect_mt5()
    
    # Ambil data akun secara asli bukan simulasi
    account_data = get_account_data()
    if account_data:
        print("\n--- DATA ASLI MT5 ---")
        print(json.dumps(account_data, indent=4))
    
    mt5.shutdown()
