Attribute VB_Name = "Module1"
Public 總題數 As Integer
Public 中文比對長度 As Integer
Public 英文比對長度 As Integer
Public 每題作答秒數 As Integer
Public 每題分數 As Integer
Public Combo2倍率 As Single
Public Combo3倍率 As Single
Public 答錯扣分 As Integer

Public AI等級 As Integer
Public AI答題花費秒數min As Single
Public AI答題花費秒數max As Single
Public AI答對率 As Single
Public AI稱號 As String
Public AI詞彙庫(2, 30) As String
Public Ranking(100, 3) As String
Public Write_Ranking(101, 3) As String

Public AI此題答對率 As Integer
Public AI此題花費秒數 As Single
Public AI此題台詞編號 As Integer
Public AI對手分數倍率 As Single
    
Public 答對顏色 As Long
Public 答錯顏色 As Long
Public 答對圖片 As String
Public 答錯圖片 As String
Public 倒數圖片1 As String
Public 倒數圖片2 As String
Public 選擇顏色 As Long
Public 預設顏色 As Long
Public 分數條顏色 As Long
Public 名次顏色 As Long
Public 選人顏色 As Long

Public 題目(100, 4) As String
Public 目前題號 As Integer
Public Answers(4) As String
Public Clock_Time As Single
Public User_Combo As Integer
Public AI_Combo As Integer
Public CanEnter As Boolean
Public User此題選擇 As Integer
Public AI此題選擇 As Integer
Public User_Time As Single
Public AI_Time As Single
Public Right_Answer As Integer
Public User_Combo倍率 As Single
Public Question_Word As String
Public Max_Score As Integer
Public User_Score As Integer
Public AI_Score As Integer
Public User得分 As Integer
Public AI得分 As Integer
Public User_Right As Boolean
Public AI_Right As Boolean
Public Bomb_Bar_Len As Single
Public 炸彈圖片 As String
Public 爆炸圖片 As String
Public 火花圖片 As String
Public Spark_x As Single
Public 玩家性別 As String
Public User_Title As String
Public 玩家圖片 As String
Public MaxCombo As Integer
Public User答對題數 As Integer
Public AI答對題數 As Integer
Public User_Rank As Integer
Public ResourcePath As String
Public Score_Table(10, 2) As Integer

Public RunWhen As Double
Private Declare PtrSafe Function sndPlaySound Lib "winmm.dll" Alias "sndPlaySoundA" (ByVal lpszSoundName As String, ByVal uFlags As Long) As Long
Private Declare PtrSafe Function mciSendString Lib "winmm.dll" Alias "mciSendStringA" (ByVal lpstrCommand As String, ByVal lpstrReturnString As String, ByVal uReturnLength As Long, ByVal hwndCallback As Long) As Long

Sub Initial_Game() '初始化

CanEnter = False

ResourcePath = ThisWorkbook.Path & "\Resource\"
目前題號 = 1
MaxCombo = 0
User答對題數 = 0
AI答對題數 = 0
User_Score = 0
AI_Score = 0
User_Combo = 0
AI_Combo = 0
答對顏色 = RGB(100, 255, 100)
答錯顏色 = RGB(255, 100, 100)
答對圖片 = ResourcePath & "Img_Right.gif"
答錯圖片 = ResourcePath & "Img_Wrong.gif"
倒數圖片1 = ResourcePath & "Img_Timer1.gif"
倒數圖片2 = ResourcePath & "Img_Timer2.gif"
炸彈圖片 = ResourcePath & "Img_Bomb.gif"
爆炸圖片 = ResourcePath & "Img_Explosion.gif"
火花圖片 = ResourcePath & "Img_Spark.gif"
Spark_x = (284 - 108) / 100
Bomb_Bar_Len = 180 / 100
選擇顏色 = RGB(255, 255, 100)
預設顏色 = 0
分數條顏色 = RGB(255, 230, 153)
名次顏色 = &HC0FFFF
選人顏色 = RGB(100, 100, 230)
AI等級 = 1

Read_Setup
Create_Question

Show_UserForm1_All

End Sub

Sub Read_Setup() '讀取設定資料

玩家性別 = Worksheets("Play").Cells(1, 2).Value
User_Title = Worksheets("Play").Cells(2, 2).Value
If User_Title = "" Then User_Title = 玩家性別

Select Case 玩家性別
    Case "資深帥哥"
        玩家圖片 = ResourcePath & "Img_Male.jpg"
    Case "美女"
        玩家圖片 = ResourcePath & "Img_Female1.jpg"
    Case "美少女"
        玩家圖片 = ResourcePath & "Img_Female2.jpg"
End Select

總題數 = 10
中文比對長度 = Worksheets("Table").Cells(24, 2).Value
英文比對長度 = Worksheets("Table").Cells(25, 2).Value
每題作答秒數 = Worksheets("Table").Cells(26, 2).Value
每題分數 = Worksheets("Table").Cells(27, 2).Value
Combo2倍率 = Worksheets("Table").Cells(28, 2).Value
Combo3倍率 = Worksheets("Table").Cells(29, 2).Value
答錯扣分 = Worksheets("Table").Cells(30, 2).Value

最近總成績 = 0
For i = 1 To 3
    最近總成績 = 最近總成績 + Worksheets("Record").Cells(i, 1)
Next i
最近平均成績 = Int(最近總成績 / 3)

For i = 1 To 10
    Score_Table(i, 1) = Worksheets("Table").Cells(2 + i, 3)
    Score_Table(i, 2) = Worksheets("Table").Cells(2 + i, 3) - Worksheets("Table").Cells(2 + i - 1, 3)
    電腦對手分數表格 = Worksheets("Table").Cells(34, 1 + i)
    If 最近平均成績 > 電腦對手分數表格 Then AI等級 = i + 1
Next i
If AI等級 > 10 Then AI等級 = 10

AI答題花費秒數min = Worksheets("Table").Cells(31, 1 + AI等級).Value
AI答題花費秒數max = Worksheets("Table").Cells(32, 1 + AI等級).Value
AI答對率 = Worksheets("Table").Cells(33, 1 + AI等級).Value
AI稱號 = Worksheets("Table").Cells(31 + (AI等級 * 3) + Int(RandRange(1, 3)), 2).Value
AI對手分數倍率 = 1
每題分數 = 每題分數 * AI對手分數倍率
Max_Score = 每題分數 + (每題分數 * Combo2倍率) + (每題分數 * Combo3倍率 * (總題數 - 2))

For i = 1 To 30
    AI詞彙庫(1, i) = Worksheets("Table").Cells(65 + i, 2).Value
    AI詞彙庫(2, i) = Worksheets("Table").Cells(65 + i, 7).Value
Next i

End Sub

Sub Create_Question()   '生成題庫

Randomize Timer

For i = 1 To 總題數
Get_Word:
    字典Y = Int(RandRange(2790, 8387))
    題目(i, 1) = Worksheets("7000單字典").Cells(字典Y, 1).Value
    
    '如果單字少於4個字母就重新取得
    If Len(題目(i, 1)) < 4 Then GoTo Get_Word
    
    '剔除包含 / 與 . 的單字
    For j = 1 To Len(題目(i, 1))
        If Mid(題目(i, 1), j, 1) = "/" Or Mid(題目(i, 1), j, 1) = "." Or Mid(題目(i, 1), j, 1) = " " Or Mid(題目(i, 1), j, 1) = "-" Then GoTo Get_Word
    Next j
    
    題目(i, 4) = Worksheets("7000單字典").Cells(字典Y, 4).Value
Next i

End Sub

Sub Start_Game() '開始遊戲

UserForm1.Image_User_Head.Picture = LoadPicture(玩家圖片)
UserForm1.Image_AI_Head.Picture = LoadPicture(ResourcePath & "Img_Head-" & Trim(Str(AI等級 + 10)) & ".jpg")

Ask_Question '出題

Create_AI_Reaction '生成AI此題反應

Show_Question '顯示題目

End Sub

Sub Ask_Question() '出題

Randomize Timer

'Language_Switch = Int(RandRange(1, 2))
'If Language_Switch = 1 Then Language = "EN" Else Language = "CN"

'1~5題，看中選英，6~10題，看英選中
If 目前題號 < 6 Then
    Language = "CN"
Else
    Language = "EN"
End If

'判別這次是 看中選英/看英選中 給予相應的參數
Select Case Language
    Case "CN"
        Fliter_Lens = 中文比對長度
        題目_Field = 4
        答案_Field = 1
    Case "EN"
        Fliter_Lens = 英文比對長度
        題目_Field = 1
        答案_Field = 4
End Select

'從題庫當中取得正確答案
Question_Word = 題目(目前題號, 題目_Field)
Right_Word = 題目(目前題號, 答案_Field)
Right_Answer = Int(RandRange(1, 4))

i = 0
Start_Get_Word:

Do
    '取得錯誤答案
    Wrong_Y = Int(RandRange(2790, 8387))
    Get_Word = Worksheets("7000單字典").Cells(Wrong_Y, 答案_Field).Value
    
    '如果單字少於4個字母就重新取得
    If Len(Worksheets("7000單字典").Cells(Wrong_Y, 1)) < 4 Then GoTo Start_Get_Word

    '剔除包含 / 與 . 的單字
    For j = 1 To Len(Worksheets("7000單字典").Cells(Wrong_Y, 1))
        If Mid(Worksheets("7000單字典").Cells(Wrong_Y, 1), j, 1) = "/" Or Mid(Worksheets("7000單字典").Cells(Wrong_Y, 1), j, 1) = "." Then GoTo Start_Get_Word
    Next j

    '交叉比對正確答案與錯誤答案的重複字，若重複就重新隨機
    For a = 1 To Len(Right_Word) - Fliter_Lens + 1
        For b = 1 To Len(Get_Word) - Fliter_Lens + 1
            a_word = Mid(Right_Word, a, Fliter_Lens)
            b_word = Mid(Get_Word, b, Fliter_Lens)
            If a_word = b_word Then GoTo Start_Get_Word
        Next b
    Next a
    
    i = i + 1
    
    Answers(i) = Get_Word
    
'取得四個錯誤答案，填入選項陣列
Loop Until i = 4

'將正確答案塞入其中一個選項
Answers(Right_Answer) = Right_Word

End Sub

Sub Create_AI_Reaction() '生成AI此題反應

Randomize Timer

答對率 = AI答對率 * 100

AI此題花費秒數 = RandRange(AI答題花費秒數min, AI答題花費秒數max)
AI_Time = 每題作答秒數 - AI此題花費秒數
AI此題台詞編號 = Int(RandRange(1, 30))


'此題是否答對?
此題隨機率 = Int(RandRange(1, 100))

If 此題隨機率 <= 答對率 Then
    AI此題選擇 = Right_Answer
Else
    Do
        AI此題選擇 = Int(RandRange(1, 4))
    Loop Until AI此題選擇 <> Right_Answer
End If

End Sub

Sub Show_Question() '顯示題

Clear_Screen

UserForm1.Label_Question.ForeColor = RGB(255, 255, 255)
UserForm1.Label_Question.Font.Size = 18
UserForm1.Label_Question2.Font.Size = 18
UserForm1.Label_Question.Caption = "第" & Trim(Str(目前題號)) & "題"
UserForm1.Label_Question2.Caption = "第" & Trim(Str(目前題號)) & "題"
'Application.Speech.Speak "第" & Trim(Str(目前題號)) & "題"
'DoEvents
'sndPlaySound ResourcePath & "SND_Next.wav", 0
Delay_Time 1.5

UserForm1.Label_Question.ForeColor = &H4040FF
UserForm1.Label_Question.Font.Size = 16
UserForm1.Label_Question2.Font.Size = 16
UserForm1.Label_Question.Caption = Question_Word
UserForm1.Label_Question2.Caption = Question_Word
Application.Speech.Speak Question_Word

UserForm1.Label_Label_Answer1.Caption = Answers(1)
UserForm1.Label_Label_Answer2.Caption = Answers(2)
UserForm1.Label_Label_Answer3.Caption = Answers(3)
UserForm1.Label_Label_Answer4.Caption = Answers(4)
UserForm1.Label_Label_Answer1.Visible = True
UserForm1.Label_Button_Answer1.Visible = True
UserForm1.Label_Label_Answer2.Visible = True
UserForm1.Label_Button_Answer2.Visible = True
UserForm1.Label_Label_Answer3.Visible = True
UserForm1.Label_Button_Answer3.Visible = True
UserForm1.Label_Label_Answer4.Visible = True
UserForm1.Label_Button_Answer4.Visible = True

Clock_Time = 每題作答秒數
UserForm1.Label_Clock_Time.Caption = Round(Clock_Time, 0)
UserForm1.Image_Clock_Time.Visible = True
UserForm1.Label_Clock_Time.Visible = True

'開放作答
CanEnter = True
UserForm1.Image_Bomb.Visible = True
UserForm1.Image_Bomb_Bar.BackColor = &H80FF&
UserForm1.Image_Bomb_Bar.Visible = True
UserForm1.Image_Spark.Visible = True

Start_Timer

End Sub

Sub Start_Timer()

Do

n = False
Old_Second = Timer

Do
    If n = False Then
        DoEvents
        n = True
    End If
Loop Until Timer - Old_Second >= 0.1

Refresh_Time

Loop

End Sub

Sub Refresh_Time() '刷新倒數秒數

Clock_Time = Clock_Time - 0.1
If Clock_Time < 3.5 Then
    UserForm1.Label_Clock_Time.Font.Size = 36
    UserForm1.Label_Clock_Time.Top = 49
    UserForm1.Image_Clock_Time.Left = 156
    UserForm1.Image_Clock_Time.Top = 35
    UserForm1.Image_Clock_Time.Width = 72
    UserForm1.Image_Clock_Time.Height = 72
    UserForm1.Image_Clock_Time.Picture = LoadPicture(倒數圖片2)
    UserForm1.Image_Bomb_Bar.BackColor = &HFF&
ElseIf Clock_Time < 6.5 Then
    UserForm1.Image_Bomb_Bar.BackColor = &H8080FF
End If

UserForm1.Label_Clock_Time.Caption = Round(Clock_Time, 0)
炸彈條長度 = (Clock_Time / (每題作答秒數 / 10)) * 10 * Bomb_Bar_Len
If 炸彈條長度 < 3 Then 炸彈條長度 = 3
UserForm1.Image_Bomb_Bar.Width = Int(炸彈條長度)
UserForm1.Image_Spark.Left = Int((Clock_Time / (每題作答秒數 / 10)) * 10 * Spark_x) + 108

If Clock_Time <= AI_Time Then
    AI_Answer
End If

If User此題選擇 <> 0 And Clock_Time <= AI_Time Then
    Answer_Judgment
End If

If Clock_Time < 0.1 Then
    UserForm1.Image_Bomb.Picture = LoadPicture(爆炸圖片)
    UserForm1.Image_Bomb_Bar.Visible = False
    UserForm1.Image_Spark.Visible = False
    UserForm1.Image_Bomb_Bar.BackColor = &H80FF&
    Answer_Judgment
End If

End Sub

Sub AI_Answer() 'AI答題

UserForm1.Label_AI_Text.Caption = "你還要多久?"
Exit Sub

Select Case AI此題選擇
    Case 1
        UserForm1.Label_Label_Answer1.ForeColor = 0
        UserForm1.Label_Button_Answer1.BackColor = 選擇顏色
    Case 2
        UserForm1.Label_Label_Answer2.ForeColor = 0
        UserForm1.Label_Button_Answer2.BackColor = 選擇顏色
    Case 3
        UserForm1.Label_Label_Answer3.ForeColor = 0
        UserForm1.Label_Button_Answer3.BackColor = 選擇顏色
    Case 4
        UserForm1.Label_Label_Answer4.ForeColor = 0
        UserForm1.Label_Button_Answer4.BackColor = 選擇顏色
End Select

End Sub

Sub Answer_Judgment() '答題判斷 + AI詞語 + 相關顯示 Combo

CanEnter = False

User_Right = False
AI_Right = False

If User此題選擇 = Right_Answer Then User_Right = True
If AI此題選擇 = Right_Answer Then AI_Right = True

'顯示正確答案選項
Select Case Right_Answer
    Case 1
        UserForm1.Label_Label_Answer1.ForeColor = 0
        UserForm1.Label_Button_Answer1.BackColor = 答對顏色
    Case 2
        UserForm1.Label_Label_Answer2.ForeColor = 0
        UserForm1.Label_Button_Answer2.BackColor = 答對顏色
    Case 3
        UserForm1.Label_Label_Answer3.ForeColor = 0
        UserForm1.Label_Button_Answer3.BackColor = 答對顏色
    Case 4
        UserForm1.Label_Label_Answer4.ForeColor = 0
        UserForm1.Label_Button_Answer4.BackColor = 答對顏色
End Select

'如果User選到正確答案
If User_Right = True Then

    Select Case Right_Answer
        Case 1
            UserForm1.User_Image1.Visible = True
            UserForm1.Label_Label_Answer1.ForeColor = 0
            UserForm1.Label_Button_Answer1.BackColor = 答對顏色
        Case 2
            UserForm1.User_Image2.Visible = True
            UserForm1.Label_Label_Answer2.ForeColor = 0
            UserForm1.Label_Button_Answer2.BackColor = 答對顏色
        Case 3
            UserForm1.User_Image3.Visible = True
            UserForm1.Label_Label_Answer3.ForeColor = 0
            UserForm1.Label_Button_Answer3.BackColor = 答對顏色
        Case 4
            UserForm1.User_Image4.Visible = True
            UserForm1.Label_Label_Answer4.ForeColor = 0
            UserForm1.Label_Button_Answer4.BackColor = 答對顏色
    End Select
    
    User_Combo = User_Combo + 1
    If User_Combo = 2 Then
        User_Combo倍率 = Combo2倍率
    ElseIf User_Combo > 2 Then
        User_Combo倍率 = Combo3倍率
    Else
        User_Combo倍率 = 1
    End If

    If User_Combo > MaxCombo Then MaxCombo = User_Combo
    User答對題數 = User答對題數 + 1
    PlayMP3 ResourcePath & "SND_Right.mp3"
    'sndPlaySound ResourcePath & "SND_Right.wav", 1
    User得分 = Int((Score_Table(Int(User_Time), 1) + (User_Time - Int(User_Time)) * Score_Table(Int(User_Time), 2)) * User_Combo倍率)
    User_Score = User_Score + User得分

Else
'如果User選到錯誤答案
    User_Combo = 0

    Select Case User此題選擇
        Case 1
            UserForm1.User_Image5.Visible = True
            UserForm1.Label_Label_Answer1.ForeColor = 0
            UserForm1.Label_Button_Answer1.BackColor = 答錯顏色
        Case 2
            UserForm1.User_Image6.Visible = True
            UserForm1.Label_Label_Answer2.ForeColor = 0
            UserForm1.Label_Button_Answer2.BackColor = 答錯顏色
        Case 3
            UserForm1.User_Image7.Visible = True
            UserForm1.Label_Label_Answer3.ForeColor = 0
            UserForm1.Label_Button_Answer3.BackColor = 答錯顏色
        Case 4
            UserForm1.User_Image8.Visible = True
            UserForm1.Label_Label_Answer4.ForeColor = 0
            UserForm1.Label_Button_Answer4.BackColor = 答錯顏色
    End Select
    PlayMP3 ResourcePath & "SND_Wrong.mp3"
    'sndPlaySound ResourcePath & "SND_Wrong.wav", 1
    User_Score = User_Score - 答錯扣分
    
End If

'如果AI選到正確答案
If AI_Right = True Then

    Select Case Right_Answer
        Case 1
            UserForm1.AI_Image1.Visible = True
            UserForm1.Label_Label_Answer1.ForeColor = 0
            UserForm1.Label_Button_Answer1.BackColor = 答對顏色
        Case 2
            UserForm1.AI_Image2.Visible = True
            UserForm1.Label_Label_Answer2.ForeColor = 0
            UserForm1.Label_Button_Answer2.BackColor = 答對顏色
        Case 3
            UserForm1.AI_Image3.Visible = True
            UserForm1.Label_Label_Answer3.ForeColor = 0
            UserForm1.Label_Button_Answer3.BackColor = 答對顏色
        Case 4
            UserForm1.AI_Image4.Visible = True
            UserForm1.Label_Label_Answer4.ForeColor = 0
            UserForm1.Label_Button_Answer4.BackColor = 答對顏色
    End Select
    
    AI_Combo = AI_Combo + 1
    If AI_Combo = 2 Then
        AI_Combo倍率 = Combo2倍率
    ElseIf AI_Combo > 2 Then
        AI_Combo倍率 = Combo3倍率
    Else
        AI_Combo倍率 = 1
    End If
    
    AI得分 = Int((Score_Table(Int(AI_Time), 1) + (AI_Time - Int(AI_Time)) * Score_Table(Int(AI_Time), 2)) * AI_Combo倍率)
    AI_Score = AI_Score + AI得分
    UserForm1.Label_AI_Text.Caption = AI詞彙庫(1, AI此題台詞編號)

Else
'如果AI選到錯誤答案
    AI_Combo = 0

    Select Case AI此題選擇
        Case 1
            UserForm1.AI_Image5.Visible = True
            UserForm1.Label_Label_Answer1.ForeColor = 0
            UserForm1.Label_Button_Answer1.BackColor = 答錯顏色
        Case 2
            UserForm1.AI_Image6.Visible = True
            UserForm1.Label_Label_Answer2.ForeColor = 0
            UserForm1.Label_Button_Answer2.BackColor = 答錯顏色
        Case 3
            UserForm1.AI_Image7.Visible = True
            UserForm1.Label_Label_Answer3.ForeColor = 0
            UserForm1.Label_Button_Answer3.BackColor = 答錯顏色
        Case 4
            UserForm1.AI_Image8.Visible = True
            UserForm1.Label_Label_Answer4.ForeColor = 0
            UserForm1.Label_Button_Answer4.BackColor = 答錯顏色
    End Select
    UserForm1.Label_AI_Text.Caption = AI詞彙庫(2, AI此題台詞編號)
    AI_Score = AI_Score - 答錯扣分

End If

User此題選擇 = 0
AI此題選擇 = 0

If User_Score < 0 Then User_Score = 0
If AI_Score < 0 Then AI_Score = 0

Draw_Score

Next_Question

End Sub

Sub Draw_Score() '得分顯示

Score_Step = Max_Score / 174

If User_Score > 0 Then User_Step = Int(User_Score / Score_Step)
If AI_Score > 0 Then AI_Step = Int(AI_Score / Score_Step)

UserForm1.Image_User_Score.Top = 366 - User_Step
UserForm1.Image_User_Score.Height = User_Step
UserForm1.Image_AI_Score.Top = 366 - AI_Step
UserForm1.Image_AI_Score.Height = AI_Step

If User_Combo > 1 Then UserForm1.Label_User_Combo.Caption = Trim(Str(User_Combo)) & " Combo"
If AI_Combo > 1 Then UserForm1.Label_AI_Combo.Caption = Trim(Str(AI_Combo)) & " Combo"

User_Get_Score_Text = ""
AI_Get_Score_Text = ""

If User_Right = True Then
    User_Get_Score_Text = "+" & Trim(Str(User得分))
End If

If AI_Right = True Then
    AI_Get_Score_Text = "+" & Trim(Str(AI得分))
End If

If User_Right = False And 答錯扣分 > 0 Then
    User_Get_Score_Text = "-" & Trim(Str(答錯扣分))
End If

If AI_Right = False And 答錯扣分 > 0 Then
    AI_Get_Score_Text = "-" & Trim(Str(答錯扣分))
End If

UserForm1.Label_User_GetScore.Caption = User_Get_Score_Text
UserForm1.Label_AI_GetScore.Caption = AI_Get_Score_Text
UserForm1.Label_User_Score.Caption = User_Score
UserForm1.Label_AI_Score.Caption = AI_Score

User得分 = 0
AI得分 = 0

End Sub

Sub Next_Question() '下一題

Delay_Time 2.5

目前題號 = 目前題號 + 1
StopMP3
If 目前題號 > 總題數 Then
    Result_Screen
End If

Start_Game

End Sub

Sub Draw_User_Answer() '顯示答題選擇

Select Case User此題選擇
    Case 1
        UserForm1.Label_Button_Answer1.BackColor = 選擇顏色
    Case 2
        UserForm1.Label_Button_Answer2.BackColor = 選擇顏色
    Case 3
        UserForm1.Label_Button_Answer3.BackColor = 選擇顏色
    Case 4
        UserForm1.Label_Button_Answer4.BackColor = 選擇顏色
End Select

End Sub

Sub Draw_AI_Thinking() '顯示AI思考中

If Clock_Time > AI_Time Then
    UserForm1.Label_AI_Text.Caption = "等我一下啦!"
End If

End Sub

Sub Result_Screen() '全部題目作答完畢，顯示結算畫面

Worksheets("Play").WindowsMediaPlayer1.url = ""

UserForm2.Image_User_Head.Picture = UserForm1.Image_User_Head.Picture
UserForm2.Image_AI_Head.Picture = UserForm1.Image_AI_Head.Picture
UserForm2.Label_User_Title = UserForm1.Label_User_Title
UserForm2.Label_AI_Title = UserForm1.Label_AI_Title
UserForm2.Label_Rate = Trim(Str((User答對題數 / 總題數) * 100)) & "%"
User_Score = User_Score + Int((User答對題數 / 總題數) * 100 * 10)
UserForm2.Label_User_Score = User_Score
AI_Score = AI_Score + Int((AI答對題數 / 總題數) * 100 * 10)
UserForm2.Label_AI_Score = AI_Score

If MaxCombo < 2 Then
    UserForm2.Label_MaxCombo = "No Combo"
Else
    UserForm2.Label_MaxCombo = Trim(Str(MaxCombo)) & " Combo"
End If

Worksheets("Play").WindowsMediaPlayer1.settings.playCount = 1

Select Case User_Score
    Case Is > AI_Score
        Worksheets("Play").WindowsMediaPlayer1.url = ResourcePath & "MSC_Win.wma"
        UserForm2.Image_Result.Picture = LoadPicture(ResourcePath & "Img_Win.jpg")
        UserForm2.Image_User_Icon.Picture = LoadPicture(ResourcePath & "Img_Happy.gif")
        UserForm2.Image_AI_Icon.Picture = LoadPicture(ResourcePath & "Img_Cry.gif")
    Case Is = AI_Score
        Worksheets("Play").WindowsMediaPlayer1.url = ResourcePath & "MSC_Draw.wma"
        UserForm2.Image_Result.Picture = LoadPicture(ResourcePath & "Img_GameOver.jpg")
        UserForm2.Image_User_Icon.Picture = LoadPicture(ResourcePath & "Img_Dumb.gif")
        UserForm2.Image_AI_Icon.Picture = LoadPicture(ResourcePath & "Img_Dumb.gif")
    Case Is < AI_Score
        Worksheets("Play").WindowsMediaPlayer1.url = ResourcePath & "MSC_Lose.wma"
        UserForm2.Image_Result.Picture = LoadPicture(ResourcePath & "Img_Lose.jpg")
        UserForm2.Image_User_Icon.Picture = LoadPicture(ResourcePath & "Img_Cry.gif")
        UserForm2.Image_AI_Icon.Picture = LoadPicture(ResourcePath & "Img_Happy.gif")
End Select

Ranking_Record

ccc = 1
Select Case User_Rank
    Case 1
        min_Rank = 1
        max_Rank = 5
        Rank_Locate = 1
    Case 2
        min_Rank = 1
        max_Rank = 5
        Rank_Locate = 2
    Case 3 To 98
        min_Rank = User_Rank - 2
        max_Rank = User_Rank + 2
        Rank_Locate = 3
    Case 99
        min_Rank = 96
        max_Rank = 100
        Rank_Locate = 4
    Case 100
        min_Rank = 96
        max_Rank = 100
        Rank_Locate = 5
    Case 101
    min_Rank = 97
    max_Rank = 101
    Rank_Locate = 5
End Select

j = 1

For i = min_Rank To max_Rank
    UserForm2.Controls("Label_Rank" & j).Caption = Trim(Str(i))
    UserForm2.Controls("Label_Score" & j).Caption = Trim(Str(Write_Ranking(i, 1)))
    UserForm2.Controls("Label_Title" & j).Caption = Write_Ranking(i, 2)
    UserForm2.Controls("Label_Level" & j).Caption = "Stage " & Trim(Str(Write_Ranking(i, 3)))
    j = j + 1
Next i

UserForm2.Controls("Label_Rank" & Rank_Locate).BackColor = 名次顏色
UserForm2.Controls("Label_Score" & Rank_Locate).BackColor = 名次顏色
UserForm2.Controls("Label_Title" & Rank_Locate).BackColor = 名次顏色
UserForm2.Controls("Label_Level" & Rank_Locate).BackColor = 名次顏色

UserForm1.Hide
UserForm2.Show

End

End Sub

Sub Ranking_Record() '將成績紀錄到排行榜

For i = 1 To 2
    Worksheets("Record").Cells(i, 1) = Worksheets("Record").Cells(i + 1, 1)
Next i

Worksheets("Record").Cells(3, 1) = User_Score

'讀取Google Sheets 的 Top 100
Dim url As String
Dim status As String
Dim data As String
Dim dataRows
Dim dataColumns
Dim WinHttp

url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vScPZ3mljaPii5VxKqf2dGVBRMuwm47quXLepREU7B3xYhsZ7cb3kc-NMgX6ip0r3dQif1LjSGM1T8M/pub?output=csv"

Set WinHttp = CreateObject("WinHttp.WinHttpRequest.5.1")
WinHttp.Open "get", url, False
WinHttp.setRequestHeader "User-Agent", "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)"
WinHttp.setRequestHeader "Content-type", "application/x-www-form-urlencoded"
WinHttp.send
data = WinHttp.responseText

dataRows = Split(data, "///") '切割筆數

For Y = 0 To UBound(dataRows)
    dataColumns = Split(dataRows(Y), ",")
    For X = 0 To UBound(dataColumns) - 1
        Ranking(Y + 1, X + 1) = dataColumns(X)
    Next X
Next Y

User_Rank = 101
For i = 96 To 100
    Write_Ranking(i, 1) = Ranking(i, 1)
    Write_Ranking(i, 2) = Ranking(i, 2)
    Write_Ranking(i, 3) = Ranking(i, 3)
Next i
Write_Ranking(User_Rank, 1) = Trim(Str(User_Score))
Write_Ranking(User_Rank, 2) = User_Title
Write_Ranking(User_Rank, 3) = Trim(Str(AI等級))

'比對分數要插進哪一列
Record = False
For i = 1 To 100
    If User_Score > CInt(Ranking(i, 1)) And Record = False Then
        Record = True
        User_Rank = i
        For j = 1 To User_Rank
            Write_Ranking(j, 1) = Ranking(j, 1)
            Write_Ranking(j, 2) = Ranking(j, 2)
            Write_Ranking(j, 3) = Ranking(j, 3)
            Write_Ranking(User_Rank, 1) = Trim(Str(User_Score))
            Write_Ranking(User_Rank, 2) = User_Title
            Write_Ranking(User_Rank, 3) = Trim(Str(AI等級))
        Next j
        For k = User_Rank + 1 To 100
            Write_Ranking(k, 1) = Ranking(k - 1, 1)
            Write_Ranking(k, 2) = Ranking(k - 1, 2)
            Write_Ranking(k, 3) = Ranking(k - 1, 3)
        Next k
        Exit For
    End If
Next i

'將資料寫進Google Sheets
If User_Rank > 0 And User_Score > AI_Score And 目前題號 > 總題數 Then
    postData = "userscore=" & Write_Ranking(User_Rank, 1) & "&username=" & Write_Ranking(User_Rank, 2) & "&userlevel=" & Write_Ranking(User_Rank, 3) & "&userrank=" & User_Rank
    Set WinHttp = CreateObject("WinHttp.WinHttpRequest.5.1")
    WinHttp.Open "POST", "https://script.google.com/macros/s/AKfycbwOjWrE26dsHkDxTF1VayGieWhvs-olEVXURS3WE99tpd3oNz-zx1wNOe8cU1YXEsol3g/exec", False
    WinHttp.setRequestHeader "authority", "script.google.com"
    WinHttp.setRequestHeader "User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36"
    WinHttp.setRequestHeader "Content-type", "application/x-www-form-urlencoded"
    WinHttp.send postData
End If

End Sub

Sub Clear_Screen()

UserForm1.Label_User_Title.Caption = User_Title
UserForm1.Label_AI_Title.Caption = AI稱號
UserForm1.Label_Clock_Time.Visible = False
UserForm1.Image_Clock_Time.Visible = False

UserForm1.Label_Question.Caption = ""
UserForm1.Label_Question2.Caption = ""
UserForm1.Label_User_Combo.Caption = "" 'User_Combo
UserForm1.Label_AI_Text.Caption = "" 'AI台詞
UserForm1.Label_AI_Combo.Caption = "" 'AI_Combo
UserForm1.Label_User_GetScore.Caption = "" 'User得分
UserForm1.Label_AI_GetScore.Caption = "" 'AI得分


UserForm1.Label_Clock_Time.Font.Size = 26
UserForm1.Label_Clock_Time.Top = 55
UserForm1.Image_Clock_Time.Left = 167
UserForm1.Image_Clock_Time.Top = 47
UserForm1.Image_Clock_Time.Width = 50
UserForm1.Image_Clock_Time.Height = 50
UserForm1.Image_Clock_Time.Picture = LoadPicture(倒數圖片1)
UserForm1.Image_Bomb_Bar.BackColor = &H80FF&
UserForm1.Image_Bomb.Picture = LoadPicture(炸彈圖片)
UserForm1.Image_Bomb.Visible = False
UserForm1.Image_Bomb_Bar.Visible = False
UserForm1.Image_Bomb_Bar.Width = 180
UserForm1.Image_Spark.Visible = False
UserForm1.Image_Spark.Left = Int(10 * 10 * Spark_x) + 108
    
UserForm1.User_Image1.Visible = False
UserForm1.User_Image2.Visible = False
UserForm1.User_Image3.Visible = False
UserForm1.User_Image4.Visible = False
UserForm1.User_Image5.Visible = False
UserForm1.User_Image6.Visible = False
UserForm1.User_Image7.Visible = False
UserForm1.User_Image8.Visible = False
UserForm1.AI_Image1.Visible = False
UserForm1.AI_Image2.Visible = False
UserForm1.AI_Image3.Visible = False
UserForm1.AI_Image4.Visible = False
UserForm1.AI_Image5.Visible = False
UserForm1.AI_Image6.Visible = False
UserForm1.AI_Image7.Visible = False
UserForm1.AI_Image8.Visible = False

UserForm1.Label_Label_Answer1.Visible = False
UserForm1.Label_Label_Answer1.ForeColor = &HFFFFFF
UserForm1.Label_Button_Answer1.Visible = False
UserForm1.Label_Label_Answer2.Visible = False
UserForm1.Label_Label_Answer2.ForeColor = &HFFFFFF
UserForm1.Label_Button_Answer2.Visible = False
UserForm1.Label_Label_Answer3.Visible = False
UserForm1.Label_Label_Answer3.ForeColor = &HFFFFFF
UserForm1.Label_Button_Answer3.Visible = False
UserForm1.Label_Label_Answer4.Visible = False
UserForm1.Label_Label_Answer4.ForeColor = &HFFFFFF
UserForm1.Label_Button_Answer4.Visible = False

UserForm1.Label_Button_Answer1.BackColor = 預設顏色
UserForm1.Label_Button_Answer2.BackColor = 預設顏色
UserForm1.Label_Button_Answer3.BackColor = 預設顏色
UserForm1.Label_Button_Answer4.BackColor = 預設顏色

End Sub

Sub Show_UserForm1_All()

Read_Setup
UserForm1.Show

End Sub

Sub Delay_Time(DelaySecond)

Old_Time = Timer

n = False
Do

If n = False Then
    DoEvents
    n = True
End If
Loop Until Timer - Old_Time >= DelaySecond

End Sub

Private Function RandRange(ByVal Rand_A As Single, ByVal Rand_B As Single) As Single

Randomize Timer
RandRange = (Rnd * ((Rand_B - Rand_A) + 1)) + Rand_A

End Function

Sub PlayMP3(ByVal mp3FilePath As String)
    Dim command As String
    Dim returnValue As Long

    ' ???}MP3????
    command = "open """ & mp3FilePath & """ type mpegvideo alias mp3"
    returnValue = mciSendString(command, vbNullString, 0, 0)

    ' ?b?I??????MP3????
    command = "play mp3"
    returnValue = mciSendString(command, vbNullString, 0, 0)
End Sub

Sub StopMP3()
    Dim command As String
    Dim returnValue As Long

    ' °±????????????MP3????
    command = "stop mp3"
    returnValue = mciSendString(command, vbNullString, 0, 0)

    command = "close mp3"
    returnValue = mciSendString(command, vbNullString, 0, 0)
End Sub
