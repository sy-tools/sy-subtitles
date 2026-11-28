import json
from pathlib import Path

from tests.spa_sources import SITE, loaded_script_paths, sources_mentioning, spa_sources

# One page for both readers (tests/test_spa_sources.js takes the same file).
PAGE = json.loads((Path(__file__).parent / "fixtures" / "loaded_scripts_page.json").read_text(encoding="utf-8"))


def test_loaded_scripts_are_read_from_the_script_tags_in_order():
    assert loaded_script_paths("\n".join(PAGE["html"])) == PAGE["loaded"]


def test_the_real_page_gives_index_html_then_every_script_it_loads():
    sources = spa_sources()
    names = [name for name, _ in sources]

    assert names[0] == "index.html"
    assert len(names) > 10, "parsed the script tags"
    assert names[1:] == loaded_script_paths(sources[0][1])
    assert all(text for _, text in sources)
    assert not [name for name in names[1:] if not (SITE / name).is_file()]


def test_sources_are_searched_minus_the_modules_excused():
    assert sources_mentioning("function getOverallStatus") == ["js/pipeline_stages.js"]
    assert sources_mentioning("function getOverallStatus", except_=("js/pipeline_stages.js",)) == []
