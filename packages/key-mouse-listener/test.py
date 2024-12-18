from pynput import mouse
import time
import threading

def log_position_every_second():
    try:
        while True:
            time.sleep(1)
            print(f"Mouse position: {mouse.Controller().position}")
    except KeyboardInterrupt:
        print("Exiting gracefully...")

if __name__ == "__main__":
    thread = threading.Thread(target=log_position_every_second)
    thread.start()
    try:
        while thread.is_alive():
            thread.join(1)
    except KeyboardInterrupt:
        print("Main thread exit")