package service

import (
	"testing"

	"topoknow-backend/internal/model"
)

func TestCleanAIResponse(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want string
	}{
		{"plain json", `{"a":1}`, `{"a":1}`},
		{"json array", `[{"a":1},{"b":2}]`, `[{"a":1},{"b":2}]`},
		{"fence json lowercase", "```json\n{\"a\":1}\n```", `{"a":1}`},
		{"fence JSON uppercase", "```JSON\n{\"a\":1}\n```", `{"a":1}`},
		{"fence json with space", "``` json\n{\"a\":1}\n```", `{"a":1}`},
		{"plain fence", "```\n{\"a\":1}\n```", `{"a":1}`},
		{"fence no closing", "```json\n{\"a\":1}", `{"a":1}`},
		{"leading whitespace then fence", "  \n```json\n{\"a\":1}\n```", `{"a":1}`},
		// 内容里含 ``` 但整体未被围栏包裹：不能误删（用双引号串避免反引号嵌套）
		{"content ends with backticks not fenced", "{\"content\":\"x ```\"}", "{\"content\":\"x ```\"}"},
		{"content has code block inside not wrapped", "{\"content\":\"```py\\ncode\\n```\"}", "{\"content\":\"```py\\ncode\\n```\"}"},
		{"fenced array", "```json\n[{\"a\":1}]\n```", `[{"a":1}]`},
		{"empty string", "", ""},
		{"only fence", "```\n```", ""},
		{"markdown json fence mixed case", "```Json\n{\"a\":1}\n```", `{"a":1}`},
		// 关键回归：旧版只认小写 ```json，遇到大写标记会残留 "JSON" 前缀导致解析失败
		{"regression uppercase tag", "```JSON\n{\"q\":1}\n```", `{"q":1}`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := cleanAIResponse(c.raw); got != c.want {
				t.Errorf("cleanAIResponse(%q)\n  got:  %q\n  want: %q", c.raw, got, c.want)
			}
		})
	}
}

func TestBuildContextEmptySafe(t *testing.T) {
	// 空入参必须返回空串（题目/文章无祖先或无兄弟时占位符渲染为空）
	if got := buildAncestorContext(nil); got != "" {
		t.Errorf("buildAncestorContext(nil) = %q, want empty", got)
	}
	if got := buildSiblingContext(nil); got != "" {
		t.Errorf("buildSiblingContext(nil) = %q, want empty", got)
	}
	// 空 Importance / Description 字段不应导致 panic 或格式异常
	got := buildSiblingContext([]model.SiblingInfo{{Topic: "X"}})
	if got == "" {
		t.Errorf("buildSiblingContext with one item should not be empty")
	}
}
