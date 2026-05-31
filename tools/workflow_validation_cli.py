"""CLI wrapper around workflow_validation — used as a guard step inside workflows."""

from __future__ import annotations

import argparse

from tools.workflow_validation import (
    InvalidWorkflowInput,
    die,
    validate_talk_id,
    validate_video_ref,
    validate_video_slug,
)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--talk-id")
    parser.add_argument("--video-slug")
    parser.add_argument("--video-ref")
    args = parser.parse_args(argv)
    try:
        if args.talk_id is not None:
            validate_talk_id(args.talk_id)
        if args.video_slug is not None:
            validate_video_slug(args.video_slug)
        if args.video_ref is not None:
            validate_video_ref(args.video_ref)
    except InvalidWorkflowInput as e:
        die(str(e))


if __name__ == "__main__":
    main()
