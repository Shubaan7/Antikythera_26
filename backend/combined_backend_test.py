from flask import Flask, jsonify, request
from skyfield.api import load
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

ts = load.timescale()
planets = load('de421.bsp')

@app.route("/planet", methods=["GET"])
def get_planet():

    planet_name = request.args.get("name")
    date_str = request.args.get("date")  # NEW: optional date param, e.g. "2026-07-08"

    if not planet_name:
        return jsonify({"error": "Missing required parameter: name"}), 400

    planet_name = planet_name.strip().lower()

    try:
        # NEW: use the requested date if given, otherwise fall back to right now
        if date_str:
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                return jsonify({
                    "error": f"Invalid date format: '{date_str}'. Expected YYYY-MM-DD."
                }), 400
            t = ts.utc(dt.year, dt.month, dt.day)
        else:
            t = ts.now()

        earth = planets['earth']
        target_planet = planets[planet_name]
        astrometric = earth.at(t).observe(target_planet)
        ra, dec, distance = astrometric.radec()

        return jsonify({
            "planet": planet_name,
            "date": date_str if date_str else t.utc_strftime("%Y-%m-%d"),
            "ra": ra.degrees,
            "dec": dec.degrees,
            "distance_au": distance.au
        })

    except KeyError:
        return jsonify({
            "error": f"Unknown planet: '{planet_name}'"
        }), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)

# http://127.0.0.1:5000/planet?name=mars
# http://127.0.0.1:5000/planet?name=mars&date=2026-07-08