"""Claude Agent SDK로 이 리포지토리의 테스트를 실행하고 실패 원인을 판정하는 스크립트.

- 사용 도구: Read(파일 읽기), Bash(터미널 실행)만 허용 (Edit/Write 등은 비허용)
- 권한 모드: acceptEdits (편집 관련 승인은 자동 수락)
- query()는 Claude Code 하네스의 에이전트 루프이므로, 한 번 호출하면
  테스트 실행 -> 실패 분석 -> 결론 도출까지 내부적으로 반복(tool 호출 다회)한다.
  중간에 도착하는 메시지를 순서대로 그대로 출력한다.

실행:
    python scripts/run_test_diagnosis.py
"""

import asyncio

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    SystemMessage,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
    query,
)

REPO_ROOT = r"C:\Users\sdok1\projects\practice-for-claude-code-architecutre"

PROMPT = (
    "이 리포지토리의 테스트를 실행해줘. package.json의 test 스크립트는 "
    "`node --test`이니 `npm test`로 실행하면 돼.\n"
    "테스트가 실패하면 관련 소스 코드와 테스트 코드를 Read로 읽어서 실패 원인을 분석해줘. "
    "모든 테스트가 통과하면 그렇게 판단하면 돼.\n"
    "원인이 확실해지면(테스트 결과와 코드를 근거로 확인한 뒤) 반드시 마지막 줄에 "
    "아래 형식으로 정확히 한 문장만 출력하고 끝내:\n"
    "원인: <실패 원인 한 문장, 또는 '모든 테스트 통과'>"
)


def _format_block(block) -> str | None:
    """콘텐츠 블록 하나를 한 줄로 요약한다. 모르는 타입은 None을 반환."""
    if isinstance(block, TextBlock):
        return block.text
    if isinstance(block, ToolUseBlock):
        return f"[tool_use] {block.name} input={block.input}"
    if isinstance(block, ToolResultBlock):
        return str(block.content)
    return None


async def main() -> None:
    options = ClaudeAgentOptions(
        cwd=REPO_ROOT,
        allowed_tools=["Read", "Bash"],
        permission_mode="acceptEdits",
    )

    final_result: str | None = None

    async for message in query(prompt=PROMPT, options=options):
        if isinstance(message, SystemMessage):
            print(f"[system:{message.subtype}]")

        elif isinstance(message, AssistantMessage):
            for block in message.content:
                text = _format_block(block)
                if text is not None:
                    print(f"[assistant] {text}")

        elif isinstance(message, UserMessage):
            # 도구 실행 결과가 UserMessage로 되돌아온다.
            content = message.content
            if isinstance(content, str):
                print(f"[tool_result] {content}")
            else:
                for block in content:
                    text = _format_block(block)
                    if text is not None:
                        print(f"[tool_result] {text}")

        elif isinstance(message, ResultMessage):
            final_result = message.result
            print(
                f"[result] is_error={message.is_error} "
                f"num_turns={message.num_turns} "
                f"cost_usd={message.total_cost_usd}"
            )

    print()
    print("=== 최종 판정 ===")
    print(final_result or "(원인 판정 결과를 받지 못했습니다)")


if __name__ == "__main__":
    asyncio.run(main())
