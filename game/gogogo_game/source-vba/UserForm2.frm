VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} UserForm2 
   Caption         =   "結算成績"
   ClientHeight    =   8970.001
   ClientLeft      =   110
   ClientTop       =   470
   ClientWidth     =   7470
   OleObjectBlob   =   "UserForm2.frx":0000
   StartUpPosition =   1  '所屬視窗中央
End
Attribute VB_Name = "UserForm2"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Private Sub UserForm_Terminate()

Worksheets("Play").WindowsMediaPlayer1.url = ""
End

End Sub
