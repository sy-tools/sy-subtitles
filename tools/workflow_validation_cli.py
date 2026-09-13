"""CLI wrapper around workflow_validation — used as a guard step inside workflows."""

from __future__ import annotations

import argparse

from tools.workflow_validation import (
    InvalidWorkflowInput,
    die,
    validate_clip,
    validate_git_ref,
    validate_subs_scale,
    validate_talk_id,
    validate_video_ref,
    validate_video_slug,
)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--talk-id")
    parser.add_argument("--video-slug")
    parser.add_argument("--video-ref")
    parser.add_argument("--source-ref")
    # Pass these two as --flag=VALUE. A separate word starting with "-", such
    # as the clip "-5-3000", is read by argparse as an option and dies with a
    # usage error before the validator can explain what is wrong.
    parser.add_argument("--subs-scale")
    parser.add_argument("--clip", help="empty means the whole video")
    args = parser.parse_args(argv)
    try:
        if args.source_ref is not None:
            validate_git_ref(args.source_ref)
        if args.talk_id is not None:
            validate_talk_id(args.talk_id)
        if args.video_slug is not None:
            validate_video_slug(args.video_slug)
        if args.video_ref is not None:
            validate_video_ref(args.video_ref)
        if args.subs_scale is not None:
            validate_subs_scale(args.subs_scale)
        if args.clip is not None:
            validate_clip(args.clip)
    except InvalidWorkflowInput as e:
        die(str(e))


if __name__ == "__main__":
    main()
