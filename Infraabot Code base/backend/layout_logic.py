import re
import json

def parse_layout(raw_text):
    """
    Parses Architext's output (JSON, DSL, or coordinate format) into structured layout data.
    """
    # Try JSON first
    try:
        layout = json.loads(raw_text)
        if isinstance(layout, list) and all("name" in room for room in layout):
            return layout
    except json.JSONDecodeError:
        pass  # Not JSON, proceed

    # Try coordinate format
    coord_rooms = parse_coordinate_layout(raw_text)
    if coord_rooms:
        return coord_rooms

    # Fallback to DSL
    return parse_layout_dsl(raw_text)

def parse_coordinate_layout(raw_text):
    """
    Parses coordinate-based room layout output like:
    (91,157)(47,157)(47,113)(91,113), living_room: (209,143)(121,143)(121,69)(209,69), ...
    Returns a list of rooms with name and points.
    """
    rooms = []
    # Split on ', ' but keep the first entry if it doesn't have a label
    entries = [e.strip() for e in re.split(r',\s*(?=\w+:)', raw_text)]
    for entry in entries:
        # If there's a label (e.g. "living_room: ...")
        if ':' in entry:
            label, coords = entry.split(':', 1)
            label = label.strip()
        else:
            label = "room"
            coords = entry
        # Find all (x,y) pairs
        points = re.findall(r'\((\d+),(\d+)\)', coords)
        if points:
            rooms.append({
                "name": label,
                "points": [[int(x), int(y)] for x, y in points]
            })
    return rooms

def parse_layout_dsl(dsl_text):
    """
    Parses a simple DSL for room layouts into structured JSON.
    Example DSL:
    Room: Bedroom, 12x10, position (0,0)
    Room: Kitchen, 10x8, next to Bedroom
    """
    rooms = []
    for line in dsl_text.strip().splitlines():
        match = re.match(r"Room:\s*(.*?),\s*(\d+)x(\d+),\s*(.*)", line)
        if match:
            name = match.group(1).strip()
            width = int(match.group(2))
            height = int(match.group(3))
            rest = match.group(4).strip()
            room = {"name": name, "width": width, "height": height}
            # Parse position or adjacency
            pos_match = re.match(r"position\s*\(([\d\-]+),\s*([\d\-]+)\)", rest)
            adj_match = re.match(r"next to (.+)", rest)
            if pos_match:
                room["x"] = int(pos_match.group(1))
                room["y"] = int(pos_match.group(2))
            elif adj_match:
                room["adjacent_to"] = adj_match.group(1).strip()
            rooms.append(room)
    return rooms

# Example usage for testing:
if __name__ == "__main__":
    # Test JSON input
    json_input = '''
    [
        {"name": "Bedroom", "width": 12, "height": 10, "x": 0, "y": 0},
        {"name": "Kitchen", "width": 10, "height": 8, "adjacent_to": "Bedroom"}
    ]
    '''
    print("JSON Parsed:", parse_layout(json_input))

    # Test DSL input
    dsl_input = '''
    Room: Bedroom, 12x10, position (0,0)
    Room: Kitchen, 10x8, next to Bedroom
    '''
    print("DSL Parsed:", parse_layout(dsl_input))

    # Test coordinate input
    coord_input = "(91,157)(47,157)(47,113)(91,113), living_room: (209,143)(121,143)(121,69)(209,69), kitchen: (165,187)(106,187)(106,157)(121,157)(121,143)(165,143), corridor: (121,157)(91,157)(91,113)(106,113)(106,84)(121,84)"
    print("Coordinate Parsed:", parse_layout(coord_input))
